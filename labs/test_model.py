"""Tests of mathematical properties, causality and an actual learning step."""
import unittest

import torch
from torch.nn import functional as F

from labs.model import GPTConfig, TinyGPT, attention, parameter_formula
from labs.experiments import batch


class TransformerTests(unittest.TestCase):
    def setUp(self):
        torch.manual_seed(42)
        torch.set_num_threads(2)

    def test_attention_matches_hand_computation(self):
        q = torch.tensor([[1., 0.], [0., 1.], [1., 1.]])
        v = torch.tensor([[2., 0.], [0., 2.], [4., 4.]])
        out, a = attention(q, q, v, torch.ones(3, 3, dtype=torch.bool).tril())
        torch.testing.assert_close(a.sum(-1), torch.ones(3))
        self.assertEqual(a[0, 2].item(), 0)
        torch.testing.assert_close(out[2], torch.tensor([2.5105, 2.5105]), atol=1e-4, rtol=1e-4)

    def test_attention_gradients_numerically(self):
        args = tuple(torch.randn(2, 3, dtype=torch.float64, requires_grad=True) for _ in range(3))
        mask = torch.ones(2, 2, dtype=torch.bool).tril()
        self.assertTrue(torch.autograd.gradcheck(lambda q, k, v: attention(q, k, v, mask)[0], args))

    def test_future_tokens_cannot_change_past_logits(self):
        model = TinyGPT(GPTConfig(20, context=8, dim=16, heads=4, layers=2)).eval()
        a = torch.randint(20, (2, 8))
        b = a.clone()
        b[:, 4:] = (b[:, 4:] + 1) % 20
        with torch.no_grad():
            torch.testing.assert_close(model(a)[0][:, :4], model(b)[0][:, :4], atol=1e-6, rtol=1e-5)

    def test_cross_entropy_gradient(self):
        z = torch.randn(1, 5, dtype=torch.float64, requires_grad=True)
        y = torch.tensor([3])
        F.cross_entropy(z, y).backward()
        torch.testing.assert_close(z.grad, z.detach().softmax(-1) - F.one_hot(y, 5))

    def test_parameter_budget(self):
        cfg = GPTConfig(100)
        actual = sum(p.numel() for p in TinyGPT(cfg).parameters())
        self.assertEqual(actual, 115840)
        self.assertEqual(actual, parameter_formula(cfg))

    def test_shifted_batches(self):
        x, y = batch(torch.arange(100), 12, 4)
        torch.testing.assert_close(x[:, 1:], y[:, :-1])
        torch.testing.assert_close(y, x + 1)

    def test_overfits_small_batch(self):
        model = TinyGPT(GPTConfig(8, context=8, dim=32, heads=4, layers=1))
        x = torch.tensor([[1, 2, 3, 4, 1, 2, 3, 4]]).repeat(4, 1)
        y = torch.tensor([[2, 3, 4, 1, 2, 3, 4, 1]]).repeat(4, 1)
        optimizer = torch.optim.AdamW(model.parameters(), lr=.01)
        initial = model(x, y)[1].item()
        for _ in range(70):
            optimizer.zero_grad(set_to_none=True)
            loss = model(x, y)[1]
            loss.backward()
            optimizer.step()
        final = model(x, y)[1].item()
        self.assertLess(final, initial * .1)

    def test_checkpoint_roundtrip_and_generation(self):
        import io
        model = TinyGPT(GPTConfig(8, context=4, dim=16, heads=4, layers=1)).eval()
        buffer = io.BytesIO()
        torch.save({'config': model.cfg.to_dict(), 'state_dict': model.state_dict()}, buffer)
        buffer.seek(0)
        saved = torch.load(buffer, weights_only=True)
        loaded = TinyGPT(GPTConfig(**saved['config'])).eval()
        loaded.load_state_dict(saved['state_dict'])
        x = torch.tensor([[1, 2, 3]])
        with torch.no_grad():
            torch.testing.assert_close(model(x)[0], loaded(x)[0])
        result = loaded.generate(x, tokens=6, top_k=3)
        self.assertEqual(tuple(result.shape), (1, 9))
        self.assertNotIn(0, result[0, 3:].tolist())


if __name__ == '__main__':
    unittest.main()
