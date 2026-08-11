# Задачи: расширенная наблюдаемость Sentry на staging

## Subtask Index

| ID | Описание | WP | Parallel |
| --- | --- | --- | --- |
| T001 | Восстановить baseline карты кода до первой source-правки | WP01 | No |
| T002 | Закрепить `@sentry/node` 10.70.0 в manifest и lockfile | WP01 | No |
| T003 | Добавить RED-тесты fail-closed конфигурации и разрешённого envelope | WP01 | No |
| T004 | Добавить RED-тесты privacy-redaction и UTF-8 truncation | WP01 | No |
| T005 | Реализовать `SentryReporter` с обязательным context и двойной очисткой | WP01 | No |
| T006 | Довести focused reporter suite до GREEN и проверить no-throw контракт | WP01 | No |
| T007 | Добавить RED-регрессию единственного capture во внешнем `processRequest` catch | WP02 | Yes, after WP01 |
| T008 | Добавить RED-регрессию process-level `uncaughtException` boundary | WP02 | Yes, after WP01 |
| T009 | Подключить request boundary без повторного capture в `requestHandler` | WP02 | Yes, after WP01 |
| T010 | Подключить process boundary с минимальным обязательным context | WP02 | Yes, after WP01 |
| T011 | Проверить неизменные HTTP-ответы и единичное владение capture | WP02 | Yes, after WP01 |
| T012 | Добавить RED-регрессию неожиданной ошибки получения игрока | WP03 | Yes, after WP01 |
| T013 | Добавить RED-регрессию исходной undo-ошибки до `InputError` | WP03 | Yes, after WP01 |
| T014 | Добавить RED-регрессии основного input catch и ожидаемых исключений | WP03 | Yes, after WP01 |
| T015 | Передать разрешённый PlayerInput-context в трёх поглощаемых путях | WP03 | Yes, after WP01 |
| T016 | Проверить gameplay-поведение, input snapshot и отсутствие дублей | WP03 | Yes, after WP01 |
| T017 | Регенерировать итоговый пакет `docs/codemap/codemap.*` | WP04 | No |
| T018 | Выполнить объединённый privacy/call-site Mocha-набор | WP04 | No |
| T019 | Выполнить server lint, test build, server/full build и diff gates | WP04 | No |
| T020 | Провести allowlist-review итогового diff и подготовить handoff без live-действий | WP04 | No |

## WP01 — SentryReporter и privacy-контракт

**Priority**: P0  
**Goal**: создать единственную fail-closed границу формирования Sentry event и доказать её на настоящем SDK client с fake transport.  
**Independent test**: `tests/server/server/SentryReporter.spec.ts` проверяет activation matrix, allowlist, обязательный boundary, message/stack redaction, gameplay input и детерминированный лимит 65 536 UTF-8-байт без сетевой доставки.  
**Dependencies**: none  
**Prompt**: `tasks/WP01-sentry-reporter-privacy-boundary.md`  
**Estimated prompt size**: ~300 lines

- [ ] T001 До первой source-правки восстановить `docs/codemap/codemap.html`, `.json` и `.lock` из текущего task-дерева и зафиксировать, что вызывает новый модуль, что он затронет и какие тесты его покрывают.
- [ ] T002 Добавить точную dependency `@sentry/node` 10.70.0 через штатный npm workflow, изменив только `package.json` и `package-lock.json`.
- [ ] T003 Добавить RED-тесты activation matrix, valid/`n/a` release, обязательного boundary и полного разрешённого envelope через настоящий configured client с fake transport.
- [ ] T004 Добавить RED-тесты recursive denylist, перечисленных credential/header/cookie/query/IP форматов в message/stack/input, циклов, глубины и детерминированного UTF-8 truncation wrapper.
- [ ] T005 Реализовать `src/server/server/SentryReporter.ts`: типизированный context, fail-closed init, ручной event allowlist, stack parser, sanitizer, cap и защитный `beforeSend` без default integrations/data collection.
- [ ] T006 Довести focused reporter suite до GREEN; доказать no-op/no-throw при выключенной конфигурации и отказе transport, отсутствие нового обязательного env и отсутствие реальной доставки.

### Implementation sketch

1. Восстановить обязательную baseline-карту до изменения нового server module.
2. Закрепить SDK и сначала написать тестовый oracle на финальный envelope.
3. Реализовать минимальный reporter как единственного владельца SDK и privacy policy.
4. Проверить fail-closed matrix, разрешённый context и все перечисленные redaction signatures.

### Parallel opportunities

Нет внутри WP: тестовый oracle и реализация описывают один privacy-контракт и должны идти test-first в одном lane. После завершения WP01 пакеты WP02 и WP03 могут выполняться параллельно.

### Dependencies and risks

- Baseline codemap временно является обоснованной out-of-map записью этого WP; окончательное владение и повторная регенерация принадлежат WP04, который зависит от всех code WPs.
- Fake transport должен проверять реальный SDK envelope, а не дублировать реализацию sanitizer.
- Свободная строка без распознаваемой сигнатуры остаётся документированным residual risk; тесты не должны создавать ложное обещание полного secret detection.
- Default SDK integrations или data collection могут вернуть запрещённые поля, поэтому отключение и финальный allowlist являются load-bearing.

## WP02 — Request и process boundaries

**Priority**: P1  
**Goal**: зарегистрировать верхнеуровневые неожиданные ошибки ровно на одной owning boundary, сохранив прежний HTTP/process flow.  
**Independent test**: request/process regressions подтверждают один capture с правильным boundary, ноль capture для ожидаемых/malformed путей и неизменные status/body/log behavior.  
**Dependencies**: WP01  
**Prompt**: `tasks/WP02-request-process-boundaries.md`  
**Estimated prompt size**: ~250 lines

- [ ] T007 Добавить RED-регрессию capture только во внешнем catch `processRequest`, включая method и нормализованный path без query.
- [ ] T008 Добавить RED-регрессию process-level `uncaughtException` с `{boundary: 'process'}` и без нового `unhandledRejection` listener.
- [ ] T009 Подключить request capture в `requestProcessor.ts`, сохранив `requestHandler` только владельцем прежнего 500-ответа и исключив двойную отправку.
- [ ] T010 Подключить reporter к существующему process listener, сохранив локальное логирование и не ожидая сетевую доставку.
- [ ] T011 Выполнить focused request/process tests и проверить прежние HTTP status/body, malformed JSON classification и единичное владение capture.

### Implementation sketch

1. Сначала закрепить RED call-site tests через spy/stub стабильного API WP01.
2. Добавить минимальные вызовы reporter в две существующие owning boundaries.
3. Не перемещать формирование HTTP 500 и не добавлять capture в `requestHandler`.
4. Проверить количество вызовов, точный context и прежние ответы.

### Parallel opportunities

WP02 можно выполнять параллельно с WP03 после принятого WP01: owned files и runtime paths не пересекаются. Финальная сборка и codemap выполняются только в WP04 после обоих пакетов.

### Dependencies and risks

- `processRequest` и `requestHandler` образуют один error flow; второй capture создаст дубли.
- Разбор route не должен передавать query, Host, headers, IP или общий request object.
- Импорт `server.ts` может иметь process/server side effects; тест должен изолировать listener и всегда восстанавливать глобальное состояние.

## WP03 — PlayerInput diagnostic context

**Priority**: P1  
**Goal**: захватить три поглощаемых неожиданных PlayerInput-сбоя с максимально доступным разрешённым gameplay context без изменения игрового поведения.  
**Independent test**: `tests/routes/PlayerInput.spec.ts` подтверждает отдельные `player-get`, `player-undo`, `player-input` события, исходную undo error, безопасный input snapshot, ноль событий для `AppError`/`InputError`/malformed JSON и прежние responses.  
**Dependencies**: WP01  
**Prompt**: `tasks/WP03-player-input-context.md`  
**Estimated prompt size**: ~280 lines

- [ ] T012 Добавить RED-регрессию unexpected get-player error с method/path/gameId/playerId и без выдуманного gameplay input.
- [ ] T013 Добавить RED-регрессию unexpected undo error, захваченную один раз до преобразования в `InputError`, с доступным очищаемым input.
- [ ] T014 Добавить RED-регрессии unexpected main input catch и нулевого capture для `AppError`, `InputError` и malformed JSON при прежних response payloads.
- [ ] T015 Подключить reporter в трёх owning paths и передавать только обязательный boundary и реально доступные method/path/raw IDs/parsed input snapshot.
- [ ] T016 Выполнить focused PlayerInput suite, доказать отсутствие дублей, неизменность entity/gameplay и независимость диагностического snapshot от последующих мутаций.

### Implementation sketch

1. Расширить существующие route fixtures точечными injected failures.
2. Зафиксировать точный context для каждой из трёх границ до source changes.
3. Вызвать reporter до поглощения/преобразования unexpected error, но после безопасного получения доступных полей.
4. Сохранить прежние log/response/gameplay paths и прогнать весь `PlayerInput.spec.ts`.

### Parallel opportunities

WP03 можно выполнять параллельно с WP02 после WP01. Его owned files ограничены PlayerInput route и профильным тестом; изменения общего reporter запрещены без возврата пакета на перепланирование.

### Dependencies and risks

- `entityForLog` и parsed input имеют разные моменты жизни; диагностический snapshot не должен потерять исходный gameplay input или включить request body до успешного parse.
- Undo обязательно захватывает исходную неожиданную error до нового ожидаемого `InputError`.
- Get-player error возникает до основного input catch; перенос capture ниже потеряет событие.
- Тесты не должны ослаблять существующие security/runId/hidden-information проверки.

## WP04 — Codemap и итоговые quality gates

**Priority**: P1  
**Goal**: собрать два интеграционных lane, синхронизировать карту кода с итоговым деревом и доказать готовность пакета без внешней отправки.  
**Independent test**: объединённый профильный suite, server lint/build и полный build проходят; codemap отвечает на callers/impact/tests и lock соответствует итоговому tree fingerprint.  
**Dependencies**: WP02, WP03  
**Prompt**: `tasks/WP04-codemap-and-quality-gates.md`  
**Estimated prompt size**: ~210 lines

- [ ] T017 После интеграции WP02 и WP03 регенерировать `docs/codemap/codemap.html`, `.json` и `.lock` из итогового task-дерева и проверить новый reporter, пять callers и три test surfaces.
- [ ] T018 Выполнить объединённый Mocha-набор reporter/requestProcessor/PlayerInput с fake transport и без реального DSN или сетевого Sentry event.
- [ ] T019 Выполнить `npm run build:tests`, `npm run lint:server`, `npm run build:server`, полный `npm run build`, JSON/codemap checks и `git diff --check`.
- [ ] T020 Провести allowlist-review diff, сверить requirements и фактический результат, зафиксировать точные evidence и остановиться перед push/PR/merge/config/deploy/live smoke.

### Implementation sketch

1. Убедиться, что оба зависимых lane интегрированы без конфликтов ownership.
2. Регенерировать единственный итоговый codemap package и проверить внутренние ссылки/fingerprint.
3. Выполнить focused затем broad gates и классифицировать любой unrelated failure доказательно.
4. Проверить scope и подготовить локальный handoff без внешнего side effect.

### Parallel opportunities

Нет: WP04 является последовательным интеграционным пакетом после WP02 и WP03.

### Dependencies and risks

- Codemap нельзя копировать как evidence из устаревшей remote-ветки; формат можно переиспользовать, данные должны быть из текущего tree.
- Полный build может выявить unrelated baseline failure; его нельзя скрывать или исправлять вне scope без нового решения.
- Реальный DSN, тестовый event, push, PR, merge и deploy остаются отдельными gates.
