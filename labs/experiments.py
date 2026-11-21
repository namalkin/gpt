"""Run with docker compose run --rm lab python -m labs.experiments COMMAND."""
import argparse
import csv
import json
import math
from pathlib import Path
import time

import torch
from torch.nn import functional as F

from .model import GPTConfig, TinyGPT, attention, parameter_formula

ROOT = Path(__file__).resolve().parent.parent


def setup(seed=42):
    torch.manual_seed(seed)
    torch.set_num_threads(2)


def math_demo(_):
    a = torch.tensor([[1., 2.], [3., 4.]])
    b = torch.tensor([[2., 0.], [1., 3.]])
    print('A @ B =\n', a @ b)
    print('Форма:', tuple((a @ b).shape))
    z = torch.tensor([0., math.log(2), math.log(3)])
    print('softmax(0, ln 2, ln 3) =', z.softmax(-1))
    print('NLL правильного третьего класса =', -z.log_softmax(-1)[2].item())
    cfg = GPTConfig(vocab_size=100)
    model = TinyGPT(cfg)
    print('Параметры: формула / код =', parameter_formula(cfg), '/', sum(p.numel() for p in model.parameters()))


def attention_demo(_):
    q = torch.tensor([[1., 0.], [0., 1.], [1., 1.]])
    v = torch.tensor([[2., 0.], [0., 2.], [4., 4.]])
    mask = torch.ones(3, 3, dtype=torch.bool).tril()
    out, weights = attention(q, q, v, mask)
    print('Scaled scores до маски:\n', q @ q.T / math.sqrt(2))
    print('Веса после маски:\n', weights)
    print('Суммы строк:', weights.sum(-1))
    print('Выход A @ V:\n', out)


def gradients_demo(_):
    z = torch.tensor([0.2, -0.3, 0.8], dtype=torch.float64, requires_grad=True)
    target = torch.tensor([2])
    loss = F.cross_entropy(z[None], target)
    loss.backward()
    manual = z.detach().softmax(-1) - F.one_hot(target[0], 3)
    numeric = []
    for i in range(3):
        delta = torch.zeros_like(z)
        delta[i] = 1e-6
        hi = F.cross_entropy((z.detach() + delta)[None], target)
        lo = F.cross_entropy((z.detach() - delta)[None], target)
        numeric.append(((hi - lo) / 2e-6).item())
    print('p − one_hot(y):', manual)
    print('Autograd:     ', z.grad)
    print('Разность:     ', numeric)
    print('Макс. ошибка: ', (z.grad - torch.tensor(numeric, dtype=z.dtype)).abs().max().item())


def encode(text, stoi):
    return torch.tensor([stoi.get(char, 0) for char in text], dtype=torch.long)


def load_data(path):
    text = Path(path).read_text(encoding='utf-8')
    split = int(len(text) * .9)
    train, val = text[:split], text[split:]
    vocab = ['<unk>'] + sorted(set(train))
    stoi = {char: i for i, char in enumerate(vocab)}
    return encode(train, stoi), encode(val, stoi), vocab


def batch(data, context, batch_size, generator=None):
    if len(data) <= context:
        raise ValueError(f'Нужно больше {context} символов в каждой части корпуса, получено {len(data)}')
    starts = torch.randint(len(data) - context, (batch_size,), generator=generator)
    x = torch.stack([data[i:i + context] for i in starts.tolist()])
    y = torch.stack([data[i + 1:i + context + 1] for i in starts.tolist()])
    return x, y


@torch.no_grad()
def evaluate(model, train, val, batch_size):
    model.eval()
    result = []
    # Fixed evaluation windows, independent of the training RNG.
    generator = torch.Generator().manual_seed(1234)
    for data in (train, val):
        losses = [model(*batch(data, model.cfg.context, batch_size, generator))[1].item()
                  for _ in range(8)]
        result.append(sum(losses) / len(losses))
    model.train()
    return result


def train_demo(args):
    setup(args.seed)
    train, val, vocab = load_data(args.data)
    cfg = GPTConfig(len(vocab), args.context, args.dim, args.heads, args.layers)
    if min(len(train), len(val)) <= cfg.context:
        raise ValueError('Train и validation должны быть длиннее context; увеличьте корпус или уменьшите context')
    model = TinyGPT(cfg)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.lr, weight_decay=.01)
    output = ROOT / 'runs'
    output.mkdir(exist_ok=True)
    settings = {**vars(args), 'torch_version': str(torch.__version__), 'config': cfg.to_dict()}
    settings.pop('func', None)
    (output / 'config.json').write_text(json.dumps(settings, ensure_ascii=False, indent=2), encoding='utf-8')
    print('CPU, потоков: 2; параметры:', sum(p.numel() for p in model.parameters()))
    print('Train/val символов:', len(train), len(val), '; словарь:', len(vocab))
    start = time.perf_counter()
    with (output / 'metrics.csv').open('w', newline='', encoding='utf-8') as stream:
        writer = csv.writer(stream)
        writer.writerow(['step', 'train_loss', 'val_loss', 'elapsed_seconds'])
        for step in range(args.steps + 1):
            if step % args.log_every == 0 or step == args.steps:
                tr, va = evaluate(model, train, val, args.batch)
                elapsed = time.perf_counter() - start
                writer.writerow([step, tr, va, elapsed])
                stream.flush()
                print(f'step {step:5d} | train {tr:.4f} | val {va:.4f} | {elapsed:.1f}s')
            if step == args.steps:
                break
            x, y = batch(train, cfg.context, args.batch)
            optimizer.zero_grad(set_to_none=True)
            _, loss = model(x, y)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
    torch.save({'config': cfg.to_dict(), 'state_dict': model.state_dict(),
                'vocab': vocab, 'steps': args.steps}, output / 'checkpoint.pt')
    print('Сохранено: runs/checkpoint.pt, runs/config.json, runs/metrics.csv')


def generate_demo(args):
    setup(args.seed)
    path = Path(args.checkpoint)
    if not path.exists():
        raise ValueError('Сначала запустите train: checkpoint ещё не создан')
    checkpoint = torch.load(path, map_location='cpu', weights_only=True)
    model = TinyGPT(GPTConfig(**checkpoint['config']))
    model.load_state_dict(checkpoint['state_dict'])
    vocab = checkpoint['vocab']
    stoi = {char: i for i, char in enumerate(vocab)}
    prompt = args.prompt or ' '
    unknown = sorted(set(prompt) - set(stoi))
    if unknown:
        print('Неизвестные символы prompt заменены на <unk>:', repr(''.join(unknown)))
    ids = encode(prompt, stoi)[None]
    result = model.generate(ids, args.tokens, args.temperature, args.top_k)[0].tolist()
    text = ''.join(vocab[i] for i in result)
    print(text)
    (ROOT / 'runs').mkdir(exist_ok=True)
    (ROOT / 'runs/sample.txt').write_text(text, encoding='utf-8')


def benchmark_demo(_):
    setup()
    print('CPU, 2 потока, B=4,D=64,H=4,L=2; forward + backward; без optimizer.step')
    for context in (16, 32, 64, 128):
        model = TinyGPT(GPTConfig(80, context=context))
        ids = torch.randint(80, (4, context))
        times = []
        for i in range(15):
            model.zero_grad(set_to_none=True)
            start = time.perf_counter()
            model(ids, ids)[1].backward()
            if i >= 5:  # warmup
                times.append(time.perf_counter() - start)
        times.sort()
        print(f'T={context:3d}: медиана {1000 * times[len(times)//2]:.2f} ms; '
              f'scores элементов на слой={4*4*context*context:,}')


def positive(value):
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError('Нужно положительное целое число')
    return number


def main():
    parser = argparse.ArgumentParser(description='Практикум: от математики до собственного GPT')
    commands = parser.add_subparsers(dest='command', required=True)
    for name, function, help_text in [
        ('math', math_demo, 'Матрицы, softmax, параметры'),
        ('attention', attention_demo, 'Attention на конкретных числах'),
        ('gradients', gradients_demo, 'Сверка трёх способов вычислить градиент'),
        ('benchmark', benchmark_demo, 'Время forward/backward при разной длине')]:
        commands.add_parser(name, help=help_text).set_defaults(func=function)
    train = commands.add_parser('train', help='Обучить маленький GPT на CPU')
    train.set_defaults(func=train_demo)
    train.add_argument('--data', default=str(ROOT / 'data/tiny_ru.txt'))
    for name, default in [('steps', 400), ('batch', 16), ('context', 64), ('dim', 64),
                          ('heads', 4), ('layers', 2), ('log-every', 50)]:
        train.add_argument('--' + name, type=positive, default=default)
    train.add_argument('--lr', type=float, default=3e-3)
    train.add_argument('--seed', type=int, default=42)
    gen = commands.add_parser('generate', help='Сгенерировать текст из сохранённых весов')
    gen.set_defaults(func=generate_demo)
    gen.add_argument('--checkpoint', default=str(ROOT / 'runs/checkpoint.pt'))
    gen.add_argument('--prompt', default='модель ')
    gen.add_argument('--tokens', type=positive, default=180)
    gen.add_argument('--temperature', type=float, default=.8)
    gen.add_argument('--top-k', type=int, default=0)
    gen.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()
    if hasattr(args, 'lr') and (not math.isfinite(args.lr) or args.lr <= 0):
        parser.error('--lr должен быть конечным положительным числом')
    if hasattr(args, 'temperature') and (not math.isfinite(args.temperature) or args.temperature <= 0):
        parser.error('--temperature должен быть конечным положительным числом')
    if getattr(args, 'top_k', 0) < 0:
        parser.error('--top-k не может быть отрицательным')
    setup()
    try:
        args.func(args)
    except ValueError as exc:
        parser.error(str(exc))


if __name__ == '__main__':
    main()
