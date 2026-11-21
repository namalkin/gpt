import math
import unittest
from labs.from_scratch import causal_attention, gradients, loss, logits, softmax, train


class FromScratchTests(unittest.TestCase):
    def test_manual_gradient_matches_numerical_derivative(self):
        x = [1., -.5]
        weights = [[.2, -.3, .5], [.1, .4, -.2]]
        target = [.1, .6, .3]
        analytic = gradients(x, weights, target)
        epsilon = 1e-6
        for d in range(2):
            for k in range(3):
                original = weights[d][k]
                weights[d][k] = original + epsilon
                high = loss(x, weights, target)
                weights[d][k] = original - epsilon
                low = loss(x, weights, target)
                weights[d][k] = original
                self.assertAlmostEqual(analytic[d][k], (high-low)/(2*epsilon), places=7)

    def test_training_reaches_target_distribution(self):
        x, weights, target, initial = train()
        self.assertLess(loss(x, weights, target), initial)
        for actual, expected in zip(softmax(logits(x, weights)), target):
            self.assertAlmostEqual(actual, expected, places=5)

    def test_causal_attention_matches_course_example(self):
        q = [[1., 0.], [0., 1.], [1., 1.]]
        values = [[2., 0.], [0., 2.], [4., 4.]]
        out, weights = causal_attention(q, q, values)
        self.assertEqual(out[0], [2., 0.])
        self.assertEqual(weights[0], [1., 0., 0.])
        self.assertAlmostEqual(sum(weights[2]), 1.)
        self.assertAlmostEqual(out[2][0], 2.5105, places=4)
        self.assertTrue(all(math.isfinite(a) for row in out for a in row))


if __name__ == '__main__':
    unittest.main()
