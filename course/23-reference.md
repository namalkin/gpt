# Формулы, словарь и источники

## Карта обозначений

| Символ | Значение |
| --- | --- |
| B | число примеров в пакете |
| T, T_max | текущая и максимальная длина контекста |
| $\mathcal{V}$, $v$, $V$ | словарь-множество, один кандидат из словаря и число токенов; в attention матрица V означает значения — определение задаётся отдельно |
| D, H, d | ширина модели, число голов, ширина головы D/H |
| L | число слоёв; буква L также может означать loss по контексту формулы |
| θ, η | все обучаемые параметры и learning rate |
| Q,K,V | запросы, ключи, значения |
| S,A,O | оценки, веса attention, выход |
| ∂, ∇, Σ, Π | частная производная, градиент, сумма, произведение |
| ⊙, Wᵀ | покоординатное умножение и транспонирование |

## Формулы для восстановления по памяти

```math
\begin{aligned}
p(x_1,\ldots,x_t)&=\prod_{i=1}^{t}p(x_i\mid x_{<i})\\
L&=-\frac1N\sum_{i=1}^{N}\ln p_i\\
\operatorname{softmax}(z)_i&=\frac{e^{z_i-\max z}}{\sum_j e^{z_j-\max z}}\\
\frac{\partial L}{\partial z_i}&=p_i-\mathbf1_{i=y}\\
\operatorname{Attention}(Q,K,V)&=\operatorname{softmax}\left(\frac{QK^{\mathsf T}}{\sqrt d}+M\right)V\\
U&=X+\operatorname{Attn}(\operatorname{LN}(X))\\
Y&=U+\operatorname{MLP}(\operatorname{LN}(U))\\
\theta&\leftarrow\theta-\eta\nabla L\\
\operatorname{perplexity}&=\exp(L)
\end{aligned}
```

## Частые ошибки

| Симптом | Что проверить |
| --- | --- |
| Loss почти ноль сразу | утечку будущего, тождественные входы и цели |
| NaN | полностью закрытые строки маски, learning rate, численную устойчивость |
| Validation намного хуже | словарь, данные, split, переобучение |
| Неверные формы | порядок B,H,T,d и ось softmax |
| Генерация повторяется | данные, ёмкость, temperature, top-k, ограничение контекста |
| Не хватает памяти | состояния Adam, активации T², batch, кеш |
| Несколько GPU почти не ускоряют | коммуникации, загрузку данных, размер работы на устройство |

## Первоисточники

Читайте статьи после соответствующей главы, сопоставляя их обозначения с нашими. Список — учебные опорные работы, а не рейтинг или описание последней версии каждого продукта.

- [Attention Is All You Need, Vaswani et al., 2017](https://arxiv.org/abs/1706.03762): исходный encoder-decoder Transformer, scaled dot-product и multi-head attention.
- [Language Models are Unsupervised Multitask Learners, OpenAI, 2019](https://cdn.openai.com/better-language-models/language_models_are_unsupervised_multitask_learners.pdf): авторегрессионное языковое моделирование GPT-2.
- [Adam: A Method for Stochastic Optimization](https://arxiv.org/abs/1412.6980): моменты градиентов и коррекция смещения.
- [Decoupled Weight Decay Regularization](https://arxiv.org/abs/1711.05101): AdamW.
- [Layer Normalization](https://arxiv.org/abs/1607.06450): нормировка признаков.
- [RoFormer: Enhanced Transformer with Rotary Position Embedding](https://arxiv.org/abs/2104.09864): RoPE и относительное положение.
- [Root Mean Square Layer Normalization](https://arxiv.org/abs/1910.07467): RMSNorm.
- [GLU Variants Improve Transformer](https://arxiv.org/abs/2002.05202): gated feed-forward сети.
- [FlashAttention](https://arxiv.org/abs/2205.14135): точное attention с меньшим обменом с памятью.
- [GQA: Training Generalized Multi-Query Transformer Models](https://arxiv.org/abs/2305.13245): группировка K,V.
- [Switch Transformers](https://arxiv.org/abs/2101.03961): разреженный MoE и маршрутизация.
- [DeepSeek-V3 Technical Report](https://arxiv.org/abs/2412.19437): публичный пример MLA, MoE и инженерии обучения.
- [Gemini 1.5 Technical Report](https://arxiv.org/abs/2403.05530): публичный пример мультимодальной системы с длинным контекстом.
- [Training language models to follow instructions with human feedback](https://arxiv.org/abs/2203.02155): SFT и RLHF.
- [Direct Preference Optimization](https://arxiv.org/abs/2305.18290): обучение по предпочтениям без отдельной RL-петли в формулировке DPO.
- [PyTorch: autograd](https://pytorch.org/docs/stable/autograd.html), [CrossEntropyLoss](https://pytorch.org/docs/stable/generated/torch.nn.CrossEntropyLoss.html), [scaled_dot_product_attention](https://pytorch.org/docs/stable/generated/torch.nn.functional.scaled_dot_product_attention.html): справочники реализации.

## Куда идти дальше

Для математики углубите линейную алгебру: собственные значения, SVD, нормы матриц и обусловленность. Для оптимизации — кривизну, гессиан, стохастические оценки и расписания learning rate. Для алгоритмов — низкоранговые приближения, разреженность, оценку сложности. Для систем — иерархию памяти GPU, профилирование, collectives и отказоустойчивое обучение.

Последнее упражнение: объясните устройство своей модели сначала за пять минут на примере текста, затем за полчаса формулами, затем покажите в исходниках каждую формулу. Если эти три объяснения согласуются, у вас появилась связная модель понимания.
