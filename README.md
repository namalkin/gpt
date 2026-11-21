# Трансформер с нуля

Полноценный локальный курс на русском: **24 урока, 6 модулей**, математические выводы, примеры, задачи с решениями, две интерактивные лаборатории и небольшой GPT на PyTorch. От арифметики и первых строк Python до обучения, генерации, оценки FLOPs/памяти и проектирования собственной архитектуры.

Читать онлайн: **https://namalkin.site/**. Исходники и практикум: **https://github.com/namalkin/gpt**.

## Открыть курс

Понадобится запущенный Docker Desktop (Windows/macOS) или Docker Engine с Compose (Linux). Локальные Python и PyTorch устанавливать не нужно.

Скачайте проект через Git:

```sh
git clone https://github.com/namalkin/gpt.git
cd gpt
```

Или [скачайте ZIP](https://github.com/namalkin/gpt/archive/refs/heads/main.zip), распакуйте его и откройте терминал в папке, где лежит `compose.yaml`. Установка Git для варианта с ZIP не требуется.

Запустите учебник из папки проекта:

```powershell
docker compose up -d --build course
```

Адрес: **http://localhost:8080**. Начните с первого урока и идите по порядку. При первом запуске нужен интернет для образов и библиотек; после сборки интерфейс работает без CDN и внешних ресурсов. Сервер доступен только на loopback вашего ПК.

## Практика: всё внутри Docker

```powershell
docker compose --profile lab build lab
docker compose run --rm lab python -m labs.experiments math
docker compose run --rm lab python -m labs.experiments attention
docker compose run --rm lab python -m labs.experiments gradients
docker compose run --rm lab python -m unittest discover -s labs -v
docker compose run --rm lab python -m labs.experiments train --steps 400
docker compose run --rm lab python -m labs.experiments generate --prompt "модель " --tokens 180
docker compose run --rm lab python -m labs.experiments benchmark
```

GPU не требуется. PyTorch CPU скачивается отдельно от учебника. Новые версии языков или среды на Windows устанавливать не нужно. Интерактивный Python: `docker compose run --rm lab python`.

## Что внутри

- `course/` — методичка Markdown и порядок уроков; доступны также из редактора.
- `web/` — интерфейс, локальные отметки прогресса, поиск по названиям, печать урока в PDF, лаборатории attention и ресурсов.
- `labs/model.py` — полный явный causal Transformer, без готового модуля Transformer.
- `labs/experiments.py` — математика, градиенты, обучение, генерация, микробенчмарк.
- `labs/test_model.py` — численная проверка градиентов, causal mask, параметров, сдвига целей, запоминания пакета и сохранения модели.
- `data/tiny_ru.txt` — небольшой оригинальный учебный корпус.
- `runs/` — веса, конфигурация, история ошибки и сгенерированный текст.

В GitHub включена только пустая папка `runs/` с `.gitkeep`: веса, метрики и образцы текста появятся после вашего запуска. Инфраструктура конкретного сервера и резервные копии не нужны для прохождения курса и не входят в публичные исходники.

Отметки прогресса принадлежат браузеру и адресу сайта; очистка данных браузера их удаляет. Повторный `train` перезаписывает файлы текущего запуска в `runs/`. Файл весов содержит конфигурацию и словарь, но не состояние Adam для точного resume. Детали — в уроке 18.

## Обслуживание

```powershell
docker compose ps
docker compose logs course
docker compose restart course
docker compose down
```

Дополнительная проверка интерфейса в Chromium также запускается в Docker:

```powershell
docker compose --profile qa run --build --rm qa
```

Она проверяет все 24 урока, сохранение прогресса, поиск, численные результаты attention, валидацию калькулятора и отсутствие горизонтальной прокрутки на мобильном экране. Скриншоты сохраняются в `runs/`.

После правки уроков перезапустите course, после правки JS/CSS обновите страницу. После правки зависимостей/Dockerfile пересоберите соответствующий сервис. Если 8080 занят, поменяйте левый порт в `compose.yaml`. `down` останавливает сайт, но сохраняет `runs/` и локальный прогресс.

## Границы курса

Практикум — символьная decoder-only модель с обучаемыми позициями, LayerNorm, GELU и обычным multi-head attention. Это небольшой работающий baseline. RoPE, GQA, MoE, MLA, KV cache, распределённое обучение и post-training разбираются в методичке и предлагаются как дальнейшие проекты; они не выданы за реализованные возможности лабораторного GPT. Точные внутренние устройства закрытых продуктов не предполагаются известными.

Уроки опираются на оригинальные публикации; ссылки собраны в последнем уроке. Курс помогает освоить проектирование и исследование небольшого трансформера. Промышленный масштаб потребует дальнейшей работы с данными, инфраструктурой и экспериментами.
