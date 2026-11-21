"""Scalar/list implementations: no PyTorch, NumPy, or automatic differentiation."""
import math


def softmax(scores):
    peak = max(scores)
    weights = [math.exp(value - peak) for value in scores]
    total = sum(weights)
    return [value / total for value in weights]


def logits(x, weights):
    # weights: [D,K]; explicit matrix-vector multiplication.
    return [sum(x[d] * weights[d][k] for d in range(len(x)))
            for k in range(len(weights[0]))]


def loss(x, weights, target):
    z = logits(x, weights)
    peak = max(z)
    log_normalizer = peak + math.log(sum(math.exp(value - peak) for value in z))
    return -sum(q * (value - log_normalizer) for q, value in zip(target, z))


def gradients(x, weights, target):
    probabilities = softmax(logits(x, weights))
    # Chain rule by hand: dL/dz = p-q, dz[k]/dW[d,k] = x[d].
    return [[x[d] * (probabilities[k] - target[k])
             for k in range(len(target))] for d in range(len(x))]


def train(steps=200, learning_rate=.5):
    x = [1., .5]  # Fixed, artificial features of ONE context.
    target = [.1, .6, .3]  # Desired continuation frequencies for that context.
    weights = [[0., 0., 0.], [0., 0., 0.]]
    initial = loss(x, weights, target)
    for _ in range(steps):
        grad = gradients(x, weights, target)
        for d in range(len(x)):
            for k in range(len(target)):
                weights[d][k] -= learning_rate * grad[d][k]
    return x, weights, target, initial


def causal_attention(queries, keys, values):
    outputs, rows = [], []
    for i, query in enumerate(queries):
        # Only sources j<=i are available. No future leakage.
        scores = [sum(a*b for a, b in zip(query, keys[j])) / math.sqrt(len(query))
                  for j in range(i + 1)]
        row = softmax(scores)
        out = [sum(row[j] * values[j][d] for j in range(i + 1))
               for d in range(len(values[0]))]
        rows.append(row + [0.] * (len(keys) - len(row)))
        outputs.append(out)
    return outputs, rows


def main():
    print('Чистый Python: стандартная библиотека, списки и циклы. PyTorch не импортируется.')
    q = [[1., 0.], [0., 1.], [1., 1.]]
    values = [[2., 0.], [0., 2.], [4., 4.]]
    outputs, rows = causal_attention(q, q, values)
    print('\nAttention из урока:')
    for row, out in zip(rows, outputs):
        print('Веса:', [round(a, 4) for a in row], 'выход:', [round(a, 4) for a in out])
    x, weights, target, initial = train()
    print('\nОбучение линейной модели для одного фиксированного контекста:')
    print('Целевое распределение:', target)
    print('Выученное распределение:', [round(p, 6) for p in softmax(logits(x, weights))])
    print(f'Ошибка до: {initial:.6f}; после: {loss(x, weights, target):.6f}')
    print('Градиенты вычислены вручную по p-q, веса обновлены обычными циклами.')
    print('Это две маленькие демонстрации; обучаемый классификатор не содержит attention и не является GPT.')


if __name__ == '__main__':
    main()
