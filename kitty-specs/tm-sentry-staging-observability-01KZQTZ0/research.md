# Исследование технического решения

## Решение 1 — версия SDK

Выбрать `@sentry/node` 10.70.0. На 2026-08-11 это npm `latest`; пакет требует Node.js 18+, а проект закреплён на Node.js 22.x.

**Отвергнуто:** устаревшая major-версия или плавающий Git dependency. Они увеличивают миграционный риск и ухудшают воспроизводимость lockfile.

## Решение 2 — ручной расширенный payload

Использовать явный SDK capture через локальный шлюз и передавать только обязательный типизированный `ErrorDiagnosticContext`. Разрешить исходные error type/message и полный call stack после фильтрации; method и нормализованный route path; release/environment; raw game/player IDs; разобранный gameplay input. Обязательный boundary enum различает process/request/player-get/undo/input; process caller передаёт минимальный context только с boundary.

Default integrations, OpenTelemetry setup/loader hooks, breadcrumbs, tracing, logs, metrics и весь `dataCollection` выключить. Это не мешает ручному stack parser SDK, но исключает автоматический сбор headers, cookies, query, IP, local variables и request bodies. Финальный `beforeSend` повторно строит payload по allowlist.

**Отвергнуто:** автоматический HTTP/Express handler. Он собирает больше request-контекста, чем разрешено, и размывает контроль над секретами.

## Решение 3 — двухуровневое удаление секретов

Первый уровень — до SDK: recursive sanitizer копирует gameplay input, заменяет значения denylisted keys и очищает все разрешённые строки от известных credential/network formats. Второй уровень — `beforeSend`: повторная рекурсивная проверка уже собранного event. В denylist входят authorization/cookie/session/password/secret/token/API key/DSN/private key и их распространённые варианты; строковые правила покрывают header/cookie lines, URL query/fragment, IPv4/IPv6, Bearer, JWT, DSN URL, credential assignments и PEM private-key blocks.

Headers, cookies, query string, IP и user-agent не проходят через контракт context как структурные источники. Поскольку message или stack уже могут содержать их строковое представление, перечисленные network formats очищаются и там. Полная безошибочная классификация произвольной строки невозможна, поэтому тесты используют уникальные sentinel-ы для каждого поддерживаемого формата, а документация не обещает распознавание неизвестного секрета без сигнатуры.

**Отвергнуто:** один regex в `beforeSend`. Он не покрывает вложенные ключи и создаёт единственную точку отказа после формирования события.

## Решение 4 — ограничение объёма input

Gameplay input после redaction, стабильной обработки циклов и ограничения глубины детерминированно сериализуется в JSON. Размер считается `Buffer.byteLength(json, 'utf8')`. При превышении 65 536 байт создаётся валидный объект `{truncated: true, originalBytes, preview}`, где preview является детерминированным UTF-8-безопасным префиксом очищенного JSON и уменьшается до тех пор, пока сериализованный wrapper сам не станет не больше 65 536 байт. Полный доступный call chain не сокращается прикладным sanitizer.

**Отвергнуто:** неограниченная сериализация. Она может замедлить обработчик, превысить Sentry envelope limits и затруднить доставку именно проблемного события.

## Решение 5 — fail-closed активация и release

Инициализировать client только если `SENTRY_DSN` непуст, `SENTRY_ENVIRONMENT` точно равно `staging` и build head является hex Git revision, а не `n/a`. Build head берётся из уже генерируемого `src/genfiles/settings.json`; новый runtime env и Git lookup не добавляются. Неверная конфигурация оставляет reporter в no-op и не печатает DSN.

## Решение 6 — классификация и ownership

`AppError`, `InputError` и malformed JSON считаются ожидаемыми и не отправляются. Parse failure сохраняет прежний `SyntaxError` response, но помечается локально для исключения capture. Исходная неожиданная undo-ошибка отправляется до преобразования в `InputError`; ошибка получения игрока — до прежнего `not found` flow.

В request flow capture принадлежит только внешнему catch `processRequest`, после чего ошибка поднимается в существующий `requestHandler`, формирующий прежний 500 без второго capture. `PlayerInput` владеет тремя поглощаемыми путями. Process-level `uncaughtException` остаётся последней границей; новый `unhandledRejection` listener не добавляется на Node.js 22.

## Решение 7 — контекст по границам

| Boundary | Message/stack | Method/path | Game/player IDs | Gameplay input |
|---|---:|---:|---:|---:|
| `process` | да | нет | нет | нет |
| `request` | да | если разобраны | нет | нет |
| `player-get` | да | да | да | нет |
| `player-undo` | да | да | да | да |
| `player-input` | да | да | да | да |

Каждый caller обязан передать context с boundary, не выдумывает остальные отсутствующие значения и не передаёт общий request/context object.

## Решение 8 — независимый тестовый oracle

Проверять настоящий configured Sentry client с fake transport и разбирать финальный envelope. Положительные assertions подтверждают message, stack frames, обязательный boundary, method/path, IDs и gameplay input. Отрицательные тесты внедряют поддерживаемые secret/header/cookie/query/IP sentinel-форматы непосредственно в thrown message, stack и input, затем рекурсивно подтверждают их отсутствие в envelope. Truncation oracle проверяет UTF-8 byte length, валидность wrapper, стабильность повторного результата и маркер `truncated`. Call-site тесты отдельно проверяют количество capture и неизменные HTTP status/body.

## Решение 9 — карта кода

Сначала восстановить полный пакет `html/json/lock` из текущей task-ветки. Remote-ветку `origin/codex/tm-codemap` использовать лишь как совместимый формат: её evidence и fingerprints относятся к старому commit и не являются источником истины.

## Открытые вопросы

Нет. Руслан подтвердил расширенный контекст без секретов. Настройка DSN, deploy и реальный Sentry smoke остаются отдельными gates.
