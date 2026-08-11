# Исследование технического решения

## Решение 1 — версия SDK

Выбрать `@sentry/node` 10.70.0. На 2026-08-11 это актуальный npm `latest`; пакет требует Node.js 18+, а проект закреплён на Node.js 22.x.

**Отвергнуто:** устаревшая major-версия или плавающий Git dependency. Они увеличивают миграционный риск и ухудшают воспроизводимость lockfile.

## Решение 2 — ручной capture без request-инструментации

Использовать только явный `captureException` через локальный шлюз. Отключить default integrations, OpenTelemetry setup и loader hooks, breadcrumbs, tracing, logs и metrics. В `dataCollection` явно выключить user info, cookies, request/response headers и bodies, URL query, GraphQL, GenAI, database query data, stack variables и frame context lines. Перед отправкой перестроить событие по allowlist: exception type, очищенное value и минимальные stack frames, release, environment, platform, level, timestamp и event id. Не передавать SDK объекты запросов или контекст маршрута.

У `@sentry/node` 10.70.0 stack parser входит в client options независимо от default integrations, поэтому ручной `captureException` сохраняет координаты стека. Включать `tracesSampleRate: 0` не нужно: tracing options остаются `undefined`, чтобы tracing не считался настроенным.

**Отвергнуто:** автоматический HTTP/Express handler и default request integration. Они полезны для типового APM, но создают лишнюю поверхность для headers, URL, query, IP и cookies, что противоречит этой задаче.

## Решение 3 — fail-closed активация

Инициализировать реальный client только если `SENTRY_DSN` непуст и `SENTRY_ENVIRONMENT` точно равно `staging`. Во всех остальных случаях шлюз остаётся no-op. Неверный DSN не должен мешать запуску: ошибка инициализации локально журналируется без значения DSN, после чего шлюз остаётся выключенным.

**Отвергнуто:** включение по одному DSN либо по `NODE_ENV`. Эти признаки не доказывают, что процесс является разрешённым staging.

## Решение 4 — версия приложения

Передавать в шлюз существующий build head из `src/genfiles/settings.json`, который уже генерируется перед серверной сборкой и сверяется deploy-скриптом с Git HEAD. Не добавлять новый runtime env и не вычислять Git commit из production-процесса.

**Отвергнуто:** `package.json` version (`1.0.0`, недостаточно различает deploy) и вызов Git во время server startup (репозиторий не обязан существовать в runtime bundle).

## Решение 5 — классификация ошибок

`AppError` и `InputError` остаются ожидаемыми и не отправляются. Все остальные значения на выбранных catch-границах считаются неожиданными. Для non-`Error` значений шлюз создаёт нейтральное исключение без сериализации исходного объекта.

**Отвергнуто:** сериализация произвольного throwable и attached properties. Она может раскрыть request/game state и не нужна для стека.

## Решение 6 — карта кода

Сначала восстановить полный пакет `html/json/lock` из текущей task-ветки. Remote-ветку `origin/codex/tm-codemap` использовать лишь как совместимый формат: её evidence и fingerprints относятся к старому commit и не являются источником истины.

## Открытые вопросы

Нет. Настройка секретов, deploy и реальный Sentry smoke сознательно вынесены за текущий delivery gate.
