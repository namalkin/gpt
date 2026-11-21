"""A deliberately explicit decoder-only Transformer. See lessons 12–17."""
from dataclasses import asdict, dataclass
import math

import torch
from torch import nn
from torch.nn import functional as F


@dataclass
class GPTConfig:
    vocab_size: int
    context: int = 64
    dim: int = 64
    heads: int = 4
    layers: int = 2

    def __post_init__(self):
        if min(self.vocab_size, self.context, self.dim, self.heads, self.layers) < 1:
            raise ValueError('Все размеры должны быть положительными')
        if self.dim % self.heads:
            raise ValueError('dim должна делиться на heads')

    def to_dict(self):
        return asdict(self)


def attention(q, k, v, mask=None):
    """Last two dimensions are [positions, head_width]. Return output AND weights."""
    scores = (q @ k.transpose(-2, -1)) / math.sqrt(q.size(-1))
    if mask is not None:
        scores = scores.masked_fill(~mask, float('-inf'))
    weights = F.softmax(scores, dim=-1)
    return weights @ v, weights


class CausalSelfAttention(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.heads = cfg.heads
        self.qkv = nn.Linear(cfg.dim, 3 * cfg.dim, bias=False)
        self.proj = nn.Linear(cfg.dim, cfg.dim, bias=False)
        self.register_buffer('mask', torch.ones(cfg.context, cfg.context, dtype=torch.bool).tril())

    def forward(self, x):
        B, T, D = x.shape
        q, k, v = self.qkv(x).chunk(3, dim=-1)
        # [B,T,D] -> [B,T,H,d] -> [B,H,T,d]
        q, k, v = [a.reshape(B, T, self.heads, D // self.heads).transpose(1, 2)
                   for a in (q, k, v)]
        out, _ = attention(q, k, v, self.mask[:T, :T])
        out = out.transpose(1, 2).contiguous().reshape(B, T, D)
        return self.proj(out)


class Block(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.ln1 = nn.LayerNorm(cfg.dim)
        self.attn = CausalSelfAttention(cfg)
        self.ln2 = nn.LayerNorm(cfg.dim)
        self.mlp = nn.Sequential(
            nn.Linear(cfg.dim, 4 * cfg.dim, bias=False),
            nn.GELU(),
            nn.Linear(4 * cfg.dim, cfg.dim, bias=False),
        )

    def forward(self, x):
        x = x + self.attn(self.ln1(x))
        return x + self.mlp(self.ln2(x))


class TinyGPT(nn.Module):
    def __init__(self, cfg):
        super().__init__()
        self.cfg = cfg
        self.token = nn.Embedding(cfg.vocab_size, cfg.dim)
        self.position = nn.Embedding(cfg.context, cfg.dim)
        self.blocks = nn.Sequential(*[Block(cfg) for _ in range(cfg.layers)])
        self.norm = nn.LayerNorm(cfg.dim)
        self.head = nn.Linear(cfg.dim, cfg.vocab_size, bias=False)
        self.apply(self._init_weights)

    @staticmethod
    def _init_weights(module):
        if isinstance(module, (nn.Linear, nn.Embedding)):
            nn.init.normal_(module.weight, mean=0.0, std=0.02)

    def forward(self, ids, targets=None):
        B, T = ids.shape
        if T < 1 or T > self.cfg.context:
            raise ValueError(f'Длина входа должна быть от 1 до {self.cfg.context}')
        pos = torch.arange(T, device=ids.device)
        x = self.token(ids) + self.position(pos)
        logits = self.head(self.norm(self.blocks(x)))
        loss = None
        if targets is not None:
            loss = F.cross_entropy(logits.reshape(B * T, -1), targets.reshape(B * T))
        return logits, loss

    @torch.no_grad()
    def generate(self, ids, tokens=100, temperature=1.0, top_k=0):
        if temperature <= 0 or top_k < 0:
            raise ValueError('temperature > 0, top_k >= 0')
        self.eval()
        for _ in range(tokens):
            # Recompute the cropped context. This teaching model has NO KV cache.
            logits, _ = self(ids[:, -self.cfg.context:])
            next_logits = logits[:, -1, :] / temperature
            next_logits[:, 0] = float('-inf')  # Never sample <unk>.
            if top_k:
                k = min(top_k, self.cfg.vocab_size - 1)
                threshold = torch.topk(next_logits, k, dim=-1).values[:, -1:]
                next_logits = next_logits.masked_fill(next_logits < threshold, float('-inf'))
            probabilities = F.softmax(next_logits, dim=-1)
            next_id = torch.multinomial(probabilities, num_samples=1)
            ids = torch.cat((ids, next_id), dim=1)
        return ids


def parameter_formula(cfg):
    D, V, T, L = cfg.dim, cfg.vocab_size, cfg.context, cfg.layers
    return 2 * V * D + T * D + L * (12 * D * D + 4 * D) + 2 * D
