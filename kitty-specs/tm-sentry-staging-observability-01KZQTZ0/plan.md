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
**Scale/Scope**: один новый серверный модуль, пять существующих точек ошибок, три профильных набора тестов, три артефакта карты кода

## Проверка принципов

- **Разделение ответственности**: Sentry SDK, allowlist и secret-redaction инкапсулируются в одном серверном шлюзе; callers передают только типизированный диагностический контекст.
- **Локальность изменения**: клиент, БД, игровые модели, публичные API и deploy-скрипты не меняются.
- **Проверяемые решения**: активация, присутствие расширенного контекста, удаление секретов, исключение ожидаемых ошибок и сохранение ответов закреплены тестами.
- **Test-first**: сначала добавляются падающие проверки privacy/config/call sites, затем минимальная реализация.
- **Синхронизация документации**: карта кода регенерируется из актуальной task-ветки и включает новый диагностический шлюз, его callers и тесты.
- **Charter**: project-local charter отсутствует; применены встроенные требования целостности архитектуры, локальности, тестов и актуальности документации. Нарушений нет.

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
tests/server/requestProcessor.spec.ts
tests/routes/PlayerInput.spec.ts
docs/codemap/codemap.html
docs/codemap/codemap.json
docs/codemap/codemap.lock
```

**Решение по структуре**: новый модуль располагается рядом с серверной инфраструктурой и не проникает в игровые доменные классы. Текущие catch-границы получают один best-effort вызов перед прежней обработкой ошибки.

## Последовательность реализации

1. В task-owned worktree восстановить актуальный пакет `docs/codemap/codemap.*` из текущего дерева, используя прежнюю схему только как формат, а текущий код — как единственный источник evidence.
2. Добавить тесты конфигурации, положительного payload-контракта и secret-redaction шлюза на настоящем SDK с fake transport.
3. Добавить тесты контекста во внешнем catch `processRequest` и трёх неожиданных путях `PlayerInput`; доказать передачу доступных method/path/IDs/input, нулевой capture для ожидаемых ошибок, единичный capture на путь и неизменные ответы.
4. Установить точную текущую версию `@sentry/node`, реализовать fail-closed шлюз и подключить его к пяти точкам ошибок с однозначным ownership.
5. Обновить карту кода уже по итоговому дереву, затем выполнить профильные и общие проверки.

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
- **Affected surfaces**: `tests/server/server/SentryReporter.spec.ts`, `tests/server/requestProcessor.spec.ts`, `tests/routes/PlayerInput.spec.ts`.
- **Sequencing/depends-on**: none для тестовых контрактов; выполнение после IC-01 и IC-02.
- **Risks**: unit sanitizer может пройти при утечке на поздней стадии SDK; тест использует настоящий configured client с fake transport, подтверждает разрешённые sentinel-значения и рекурсивно запрещает перечисленные secret/network sentinel-ы в финальном envelope, включая значения из message и stack.

### IC-04 — Карта кода и итоговые gates

- **Purpose**: восстановить обязательную карту до изменения модуля и оставить её синхронизированной с итоговым графом callers/tests.
- **Relevant requirements**: NFR-005, C-001—C-003.
- **Affected surfaces**: `docs/codemap/codemap.html`, `docs/codemap/codemap.json`, `docs/codemap/codemap.lock`.
- **Sequencing/depends-on**: baseline до IC-02; финальная регенерация после IC-01—IC-03.
- **Risks**: прежняя remote-ветка карты устарела относительно текущего `origin/main`; её содержимое нельзя переносить как актуальное evidence.

## Проверки

- Профильный Mocha-набор для шлюза, request processor и `PlayerInput`: valid/`n/a` release, обязательный boundary, положительный расширенный payload, redaction перечисленных secret/network formats во всех полях, детерминированный UTF-8 truncation до 65 536 байт, получение игрока, undo, malformed JSON и ровно один capture.
- `npm run build:tests`.
- `npm run lint:server`.
- `npm run build:server` и затем полный `npm run build`.
- JSON parse и внутренние ссылки карты кода; `codemap.lock` соответствует итоговому commit/tree fingerprint и не сообщает скрытых изменённых модулей.
- `git diff --check` и точная проверка scope diff.

## Delivery gates

Локальные commits в task-owned ветке разрешены после проверок. Push, PR, merge, конфигурация `SENTRY_DSN` на сервере, staging deploy, реальная отправка тестового события и любые production-действия остаются отдельными gates и в этот пакет не входят.

## Complexity Tracking

Нарушений принципов и оправдываемой дополнительной сложности нет. Отдельный шлюз нужен как единственная контролируемая граница внешней отправки; более широкая система telemetry или общий event bus не вводятся.
