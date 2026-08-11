# План реализации: расширенная наблюдаемость Sentry на staging

**Ветка**: `codex/tm-sentry-staging-observability`  
**Дата**: 2026-08-11  
**Спецификация**: [spec.md](./spec.md)

## Краткое решение

Добавить один серверный шлюз с методом `capture(error, context)`. Шлюз включается только при сочетании `SENTRY_DSN`, точного `SENTRY_ENVIRONMENT=staging` и валидного build head. Он вручную формирует событие `@sentry/node` из message/full stack и обязательного контекста границы: boundary, method/path, game/player IDs и gameplay input. Перед SDK envelope рекурсивно фильтруются denylisted keys и перечисленные secret/network formats; headers, cookies, query и IP не принимаются как структурные источники. Ожидаемые `AppError`, `InputError` и malformed JSON остаются вне Sentry.

## Technical Context

**Language/Version**: TypeScript 6.0, Node.js 22.x, CommonJS output  
**Primary Dependencies**: встроенный `http`/`https`, существующий маршрутизатор Terraforming Mars, новый `@sentry/node` 10.70.0  
**Storage**: без изменений; диагностические события не сохраняются в БД приложения  
**Testing**: Mocha 11, Chai 6, существующие HTTP mocks; тесты сначала, затем реализация  
**Target Platform**: Linux staging-сервер, сборка и проверки также воспроизводятся на Windows  
**Project Type**: монолитное web-приложение с Node.js backend и Vue frontend; меняется только backend  
**Performance Goals**: захват ошибки не блокирует HTTP-ответ и не добавляет сетевой работы в штатный успешный путь  
**Constraints**: fail-closed activation; обязательный boundary для каждого события; структурный allowlist без headers/cookies/query/IP/session; распознавание перечисленных secret/network formats в свободных строках; без breadcrumbs и tracing; без изменения HTTP/gameplay; production и deploy вне объёма
**Scale/Scope**: один новый серверный модуль, пять существующих точек ошибок, четыре профильных файла тестов, три артефакта карты кода

## Проверка принципов

- **Разделение ответственности**: Sentry SDK, allowlist и secret-redaction инкапсулируются в одном серверном шлюзе; callers передают только типизированный диагностический контекст.
- **Локальность изменения**: клиент, БД, игровые модели, публичные API и deploy-скрипты не меняются.
- **Проверяемые решения**: активация, присутствие расширенного контекста, удаление секретов, исключение ожидаемых ошибок и сохранение ответов закреплены тестами.
- **Test-first**: сначала добавляются падающие проверки privacy/config/call sites, затем минимальная реализация.
- **Синхронизация документации**: до source-правок читается уже зафиксированная scoped-baseline карта; после интеграции единственный владелец актуализирует её из фактического task-дерева по документированной процедуре fingerprint.
- **Charter**: project-local charter зафиксирован перед implementation; он требует TDD, профильные и общие quality gates, task-owned branch/worktree, review перед merge и отдельные gates для push/merge/config/deploy/live/production. План этим требованиям соответствует.

## Архитектура и поток

```mermaid
flowchart LR
  U["Ошибка + доступный игровой контекст"] --> B["Существующая catch-граница"]
  B --> R["SentryReporter.capture(error, context)"]
  R --> G{"DSN + staging + release?"}
  G -- "нет" --> N["No-op"]
  G -- "да" --> S["Allowlist + redaction + 65 536-byte cap"]
  S --> E["Sentry ingest"]
  B --> O["Прежний лог/HTTP-ответ"]
```

Шлюз не принимает `Request`, `Response` или общий route `Context`. Он требует `ErrorDiagnosticContext` с обязательным `boundary` и закрытыми полями `method`, `route`, `gameId`, `playerId`, `gameplayInput`; process-level caller передаёт `{boundary: 'process'}`. SDK запускается без default integrations, OpenTelemetry hooks, breadcrumbs, tracing, logs и metrics; `dataCollection` полностью выключен. Message, stack и gameplay input проходят одинаковую фильтрацию denylisted keys и перечисленных credential/header/cookie/query/IP formats. Gameplay input сначала рекурсивно очищается с защитой от циклов и глубины, затем детерминированно сериализуется в JSON, измеряется как UTF-8 и при превышении 65 536 байт заменяется валидным wrapper с `truncated`, `originalBytes` и UTF-8-безопасным preview; размер финального `request.data` также не превышает 65 536 байт. `beforeSend` повторно применяет allowlist и redaction к финальному событию.

## Структура изменений

```text
package.json
package-lock.json
src/server/server.ts
src/server/server/requestProcessor.ts
src/server/server/SentryReporter.ts           # новый privacy boundary
src/server/routes/PlayerInput.ts
tests/server/server/SentryReporter.spec.ts     # новый config/privacy contract
tests/server/server/SentryProcessBoundary.spec.ts # новый process-boundary contract
tests/server/requestProcessor.spec.ts
tests/routes/PlayerInput.spec.ts
docs/codemap/codemap.html
docs/codemap/codemap.json
docs/codemap/codemap.lock
```

**Решение по структуре**: новый модуль располагается рядом с серверной инфраструктурой и не проникает в игровые доменные классы. Текущие catch-границы получают один best-effort вызов перед прежней обработкой ошибки.

## Последовательность реализации

1. До первой source-правки read-only проверить уже зафиксированный scoped-baseline пакет `docs/codemap/codemap.*`: он должен отвечать на callers/impact/tests и иметь совпадающий scoped fingerprint.
2. Добавить тесты конфигурации, положительного payload-контракта и secret-redaction шлюза на настоящем SDK с fake transport.
3. Добавить тесты контекста во внешнем catch `processRequest` и трёх неожиданных путях `PlayerInput`; доказать передачу доступных method/path/IDs/input, нулевой capture для ожидаемых ошибок, единичный capture на путь и неизменные ответы.
4. Установить точную текущую версию `@sentry/node`, реализовать fail-closed шлюз и подключить его к пяти точкам ошибок с однозначным ownership.
5. Единственным write-owner обновить карту кода по фактическому итоговому дереву и документированной SHA-256 процедуре, затем выполнить профильные и общие проверки.

## Implementation Concern Map

### IC-01 — Конфигурация и секретобезопасный payload

- **Purpose**: включать SDK только на staging и формировать расширенное событие, сохраняя жёсткую границу секретов.
- **Relevant requirements**: FR-001, FR-005—FR-007, FR-009, NFR-001—NFR-005.
- **Affected surfaces**: `package.json`, `package-lock.json`, новый `src/server/server/SentryReporter.ts`, новый профильный тест.
- **Sequencing/depends-on**: none.
- **Risks**: message, stack и вложенный input могут содержать известные или неизвестные секреты; поэтому default integrations и `dataCollection` выключаются, callers структурно не передают headers/query/IP, перечисленные форматы очищаются дважды, а тесты внедряют их sentinel-значения прямо в thrown message, stack и input. Неизвестная свободная строка без сигнатуры остаётся явно признанным пределом распознавания.

### IC-02 — Границы неожиданных ошибок

- **Purpose**: получить ошибки и максимально доступный разрешённый контекст, не меняя существующее HTTP/gameplay-поведение.
- **Relevant requirements**: FR-002—FR-004, FR-008, FR-009.
- **Affected surfaces**: `src/server/server.ts`, `src/server/server/requestProcessor.ts`, `src/server/routes/PlayerInput.ts` и их тесты. В request flow capture принадлежит только `processRequest`; `requestHandler` сохраняет прежний 500 без второго capture. Отдельный `unhandledRejection` listener не добавляется.
- **Sequencing/depends-on**: IC-01.
- **Risks**: двойная отправка, потеря исходной undo-ошибки и захват ожидаемого input; ownership закреплён за одной catch-границей, parse failure исключается, а каждый caller передаёт только реально доступные поля без выдуманных значений.

### IC-03 — Поведенческие и privacy-тесты

- **Purpose**: доказать независимым oracle полноту разрешённого payload, отсутствие секретов, классификацию ошибок и неизменность HTTP-ответов.
- **Relevant requirements**: все FR, NFR-004.
- **Affected surfaces**: `tests/server/server/SentryReporter.spec.ts`, `tests/server/server/SentryProcessBoundary.spec.ts`, `tests/server/requestProcessor.spec.ts`, `tests/routes/PlayerInput.spec.ts`.
- **Sequencing/depends-on**: none для тестовых контрактов; выполнение после IC-01 и IC-02.
- **Risks**: unit sanitizer может пройти при утечке на поздней стадии SDK; тест использует настоящий configured client с fake transport, подтверждает разрешённые sentinel-значения и рекурсивно запрещает перечисленные secret/network sentinel-ы в финальном envelope, включая значения из message и stack.

### IC-04 — Карта кода и итоговые gates

- **Purpose**: проверить обязательную scoped-baseline карту до изменения модуля и оставить её синхронизированной с итоговым графом callers/tests.
- **Relevant requirements**: NFR-005, C-001—C-003.
- **Affected surfaces**: `docs/codemap/codemap.html`, `docs/codemap/codemap.json`, `docs/codemap/codemap.lock`.
- **Sequencing/depends-on**: read-only baseline check до IC-02; единственное финальное обновление после IC-01—IC-03.
- **Risks**: в репозитории нет штатного codemap generator; поэтому нельзя заявлять генерацию несуществующей командой. Итоговые JSON/HTML/lock обновляются одним владельцем из проверяемых source/test evidence, а lock пересчитывается по точной scoped SHA-256 процедуре. Прежняя remote-ветка остаётся только справкой по формату.

## Проверки

- Профильный Mocha-набор для шлюза, process boundary, request processor и `PlayerInput`: valid/`n/a` release, обязательный boundary, положительный расширенный payload, redaction перечисленных secret/network formats во всех полях, детерминированный UTF-8 truncation до 65 536 байт, получение игрока, undo, malformed JSON и ровно один capture.
- `npm run build:tests`.
- `npm run lint:server`.
- `npm run build:server` и затем полный `npm run build`.
- JSON parse и внутренние ссылки карты кода; каждый path из lock существует, его SHA-256 совпадает, а composite fingerprint воспроизводится как SHA-256 от отсортированных записей `path + NUL + lowercase file hash`, соединённых LF.
- `git diff --check` и точная проверка scope diff.

## Delivery gates

Локальные commits в task-owned ветке разрешены после проверок. Push, PR, merge, конфигурация `SENTRY_DSN` на сервере, staging deploy, реальная отправка тестового события и любые production-действия остаются отдельными gates и в этот пакет не входят.

## Complexity Tracking

Нарушений принципов и оправдываемой дополнительной сложности нет. Отдельный шлюз нужен как единственная контролируемая граница внешней отправки; более широкая система telemetry или общий event bus не вводятся.
