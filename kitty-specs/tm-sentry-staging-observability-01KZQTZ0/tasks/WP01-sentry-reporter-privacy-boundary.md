---
work_package_id: WP01
title: SentryReporter, privacy и process caller
dependencies: []
requirement_refs:
- FR-001
- FR-005
- FR-007
- FR-008
- FR-009
tracker_refs: []
planning_base_branch: codex/tm-sentry-staging-observability
merge_target_branch: codex/tm-sentry-staging-observability
branch_strategy: Planning artifacts for this mission were generated on codex/tm-sentry-staging-observability. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/tm-sentry-staging-observability unless the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
- T004
- T005
- T006
- T021
- T008
- T010
phase: Фаза 1 — диагностический шлюз
assignee: ''
agent: "codex"
shell_pid: "31308"
history:
- timestamp: '2026-08-11T08:54:36Z'
  agent: codex
  action: Пакет сформирован из одобренных spec/plan и privacy-аудита PASS.
agent_profile: node-norris
authoritative_surface: src/server/server/
create_intent:
- src/server/server/SentryReporter.ts
- src/server/server/SentryProcessBoundary.ts
- tests/server/server/SentryReporter.spec.ts
- tests/server/server/SentryProcessBoundary.spec.ts
execution_mode: code_change
model: ''
owned_files:
- package.json
- package-lock.json
- src/server/server/SentryReporter.ts
- src/server/server/SentryProcessBoundary.ts
- src/server/server.ts
- tests/server/server/SentryReporter.spec.ts
- tests/server/server/SentryProcessBoundary.spec.ts
role: implementer
tags: []
---

# Запрос рабочего пакета: WP01 — SentryReporter, privacy и process caller

## ⚡ Do This First: Load Agent Profile

Загрузи `/ad-hoc-profile-load node-norris` до чтения остальных материалов и реализации. Применяй профиль только к этому bounded work package; сохрани Git, privacy и delivery gates репозитория.

## Цель

Создать единственную серверную границу отправки неожиданных ошибок в Sentry и подключить к ней первый production caller — существующий `uncaughtException` callback. Она должна включаться только на явно настроенном staging, формировать event из строгого allowlist, сохранять полезные message/full stack и расширенный gameplay context после поддерживаемой очистки и никогда не менять process flow.

Готовый пакет предоставляет стабильный API:

```ts
capture(error: unknown, context: ErrorDiagnosticContext): void
```

`context` обязателен, а `boundary` является обязательным закрытым enum. SDK, sanitizer, truncation и финальный `beforeSend` принадлежат только этому модулю.

## Контекст

Проект использует Node.js 22, TypeScript 6, CommonJS output, Mocha 11 и Chai 6. Новый dependency закреплён на `@sentry/node` 10.70.0. Автоматические SDK integrations, OpenTelemetry hooks, data collection, breadcrumbs, tracing, logs и metrics должны быть выключены.

Разрешённый event содержит только:

- SDK technical fields error event;
- `environment=staging` и валидный hex build head как release;
- очищенные `Error.name`, `Error.message` и весь доступный parsed call chain без local variables/source context;
- `request.method` и нормализованный path без query;
- очищенный gameplay input;
- tags boundary, game ID и player ID.

Запрещённые request/response/header/cookie/query/IP/session объекты не должны попадать в публичный context. Свободные строки очищаются по явно перечисленным сигнатурам; неизвестный секрет без denylisted key или распознаваемого формата остаётся признанным residual risk.

## Стратегия веток

- Planning branch: `codex/tm-sentry-staging-observability`.
- Spec Kitty merge target: `codex/tm-sentry-staging-observability`.
- External delivery target позже: task-owned PR в `main`.
- Реализация запускается командой `spec-kitty agent action implement WP01 --agent codex`.
- Execution worktree и branch берутся только из вычисленного lane в `lanes.json`; primary checkout не менять.
- После WP01 пакеты WP02 и WP03 могут ответвляться параллельно от принятого результата.

## T001 — Read-only проверка baseline карты кода

### Назначение

Выполнить обязательный read-only codemap gate до изменения нового server module и не менять файлы, которыми владеет WP04.

### Руководство

1. Проверь наличие и JSON-валидность `docs/codemap/codemap.html`, `.json` и `.lock` в выделенном execution worktree.
2. Подтверди, что scoped-baseline явно отвечает на три вопроса:
   - что вызывает будущий `SentryReporter`;
   - какие server paths он затронет;
   - какие четыре test files покроют privacy boundary и callers.
3. Проверь существование каждого confirmed evidence path и каждого lock path, затем per-file SHA-256 и composite по процедуре из `quickstart.md`; planned paths до реализации могут отсутствовать.
4. Запиши в activity/history проверенные commit и scoped composite fingerprint.
5. Не изменяй ни один codemap file. Если baseline отсутствует, невалиден или fingerprint расходится, останови WP и верни blocker владельцу WP04/planning remediation.

### Ownership

Все три codemap files принадлежат только WP04. T001 является read-only prerequisite и не создаёт out-of-map записи.

## T002 — SDK dependency

### Назначение

Закрепить воспроизводимую версию SDK без плавающей зависимости и без нового runtime prerequisite.

### Руководство

1. Добавь `@sentry/node` точно версии 10.70.0 через штатный npm workflow.
2. Изменяй только `package.json` и `package-lock.json`; не обновляй остальные dependencies opportunistically.
3. Проверь, что lockfile не содержит неожиданных массовых churn или platform-only изменений.
4. Не добавляй реальный DSN, `.env`, sample token или секрет в repo/test fixtures.

## T003 — RED activation и allowlist oracle

### Назначение

Сначала доказать ожидаемую конфигурацию и полезный event на финальной SDK-поверхности.

### Руководство

В новом `tests/server/server/SentryReporter.spec.ts` используй настоящий configured Sentry client с fake transport, который перехватывает финальный envelope без сети. Не подменяй reporter объектом, повторяющим его логику.

Покрой минимум:

1. no-op без DSN;
2. no-op при environment, отличном от точного `staging`;
3. no-op при пустом/невалидном/`n/a` build head;
4. enabled только при DSN + `staging` + валидном hex revision;
5. обязательный `boundary` на compile/runtime contract;
6. присутствие release/environment, error type/message, нескольких stack frames и разрешённых context/tags;
7. нейтральный type/message для thrown non-Error без сериализации исходного объекта;
8. не более одного event на один capture.

DSN в тесте должен быть синтетическим и заведомо не использовать реальный проект. Fake transport не должен выполнять network request.

## T004 — RED privacy и truncation oracle

### Назначение

Доказать privacy policy на конечном envelope, включая данные, уже попавшие в thrown error.

### Руководство

1. Внедри уникальные sentinel-значения непосредственно в `Error.message`, отдельные строки stack и вложенный gameplay input.
2. Покрой denylisted keys с нормализацией регистра и разделителей: authorization/cookie/session/password/secret/token/API key/DSN/private key и варианты из data model.
3. Покрой строковые форматы:
   - `Authorization:`/`Cookie:`/`Set-Cookie:` lines;
   - URL с query и fragment;
   - IPv4 и IPv6;
   - Bearer и JWT;
   - Sentry DSN;
   - credential assignments;
   - PEM private-key block.
4. Рекурсивно проверь финальный envelope: sentinel отсутствуют, разрешённые соседние значения сохранены, replacement стабилен.
5. Подтверди отсутствие default contexts, user, breadcrumbs, spans, transaction, logs, metrics, headers и cookies как структурных полей.
6. Добавь cyclic/depth cases со стабильными маркерами, не бросающими исключение.
7. Для oversized input:
   - сначала фильтруй;
   - измеряй `Buffer.byteLength(JSON.stringify(value), 'utf8')`;
   - ожидай валидный `{truncated: true, originalBytes, preview}`;
   - проверь `<= 65_536` UTF-8 bytes для сериализованного wrapper;
   - повторный запуск с тем же input даёт идентичный JSON;
   - preview не разрывает Unicode code point.

## T005 — Реализация SentryReporter

### Назначение

Довести RED-контракт до GREEN минимальным модулем без общей telemetry architecture.

### Руководство

1. Определи `ErrorDiagnosticContext` с обязательным `boundary` и опциональными `method`, `route`, `gameId`, `playerId`, `gameplayInput`.
2. Не принимай `Request`, `Response`, общий route `Context`, player или game objects.
3. Инициализируй SDK один раз только при тройном fail-closed gate:
   - непустой `SENTRY_DSN`;
   - точный `SENTRY_ENVIRONMENT === 'staging'`;
   - build head из существующего `src/genfiles/settings.json`, валидный hex и не `n/a`.
4. Отключи default integrations, OpenTelemetry setup/loader hooks и весь `dataCollection` согласно API 10.70.0.
5. Сформируй exception вручную через SDK stack parser, сохраняя весь доступный call chain, но не local variables/source context.
6. Применяй один централизованный sanitizer ко всем разрешённым строкам/объектам до SDK.
7. Сделай `beforeSend` вторым независимым барьером: заново собери event по allowlist и повтори очистку.
8. Ограничь длину type/message стабильным способом, не теряя категорию и корневую причину.
9. Любая ошибка init/capture/sanitization/transport остаётся best-effort: допустим warning без DSN и payload, но `capture` не бросает.
10. Не добавляй flush/await в caller path; listener integration выполняется отдельно в T008/T010, request listener остаётся вне этого WP.

## T006 — GREEN и контракт границы

### Проверка

Запусти профильный файл:

```powershell
npx mocha --import=tsx --require tests/testing/setup.ts tests/server/server/SentryReporter.spec.ts
```

Затем:

```powershell
npm run build:tests
npm run lint:server
git diff --check
```

Проверь отдельно:

- disabled path не инициализирует transport;
- transport failure не проходит в caller;
- environment/release берутся только из разрешающей конфигурации;
- allowlist не зависит от default SDK behavior;
- original throwable properties и `Error.cause` не сериализуются;
- test cleanup восстанавливает env, SDK state и fake transport между cases.

## T021 — Deletion-safe oracle публичного `capture`

### Назначение

Защитить стабильную экспортируемую функцию, которой пользуется production caller, а не только factory seam.

### Руководство

1. Упражняй именно экспортируемую `capture(error, context)` в изолированном module lifecycle.
2. Используй синтетический DSN и перехват метода настоящего `NodeClient` либо эквивалентный black-box seam, который исключает сеть и не заменяет SDK fake-клиентом.
3. Восстанавливай env, module cache и SDK prototype/state даже при failed assertion.
4. Мутационный oracle обязателен: временная замена тела публичного `capture` на no-op должна давать красный тест.
5. Existing fake-transport envelope tests остаются владельцем privacy/allowlist доказательства; этот тест проверяет только production export wiring.

## T008 — RED process boundary regression

### Назначение

Зафиксировать первый production caller и прежнее поведение process-level ошибки.

### Руководство

1. Создай `tests/server/server/SentryProcessBoundary.spec.ts` и минимальный `src/server/server/SentryProcessBoundary.ts`, чтобы тестировать тот же регистрируемый callback без импорта side-effectful `server.ts`.
2. Упражняй тот же callback, который регистрируется через `process.on('uncaughtException', ...)`, не копируя его logic в fixture.
3. До source edit тест должен падать из-за отсутствующего вызова публичного `capture`.
4. Проверь один вызов с исходной error и ровно `{boundary: 'process'}` плюс сохранённое локальное логирование.
5. Зафиксируй baseline количества `uncaughtException`/`unhandledRejection` listeners и восстанови его в cleanup.
6. Докажи, что новый `unhandledRejection` listener не появился.

## T010 — Process integration

### Назначение

Сделать reporter живым production module минимальным caller без изменения process semantics.

### Руководство

1. Сохрани существующий `process.on('uncaughtException', ...)` и прежний порядок локального log.
2. Вызови публичный `capture(err, {boundary: 'process'})` ровно один раз.
3. Не добавляй await/flush, retry, shutdown coordination, новый exit code или `unhandledRejection` listener.
4. Reporter failure не должен покинуть callback или преобразовать исходную error.
5. Не меняй `requestProcessor.ts`, `PlayerInput.ts` или их тесты: они остаются в WP02/WP03.

## Definition of Done

- [ ] Baseline codemap read-only проверен до первой source-правки; три обязательных ответа, evidence paths и scoped fingerprint совпадают.
- [ ] Dependency точно закреплена на 10.70.0 без unrelated lockfile churn.
- [ ] RED evidence получен до implementation для activation/privacy/truncation cases.
- [ ] `capture(error, context)` требует boundary и не принимает request/game objects.
- [ ] Настоящий SDK client + fake transport подтверждает разрешённый envelope и отсутствие поддерживаемых forbidden formats.
- [ ] `request.data` всегда валиден и не превышает 65 536 UTF-8-байт.
- [ ] Default integrations/data collection не возвращают запрещённый контекст.
- [ ] No-op мутация тела публичного `capture` ломает black-box test.
- [ ] `server.ts` является production caller и передаёт ровно `{boundary: 'process'}` без изменения log/listener semantics.
- [ ] Focused tests, test build, server lint и diff check проходят.
- [ ] Реальный DSN, network event, push, deploy или production действие не выполнялись.

## Reviewer Guidance

Отклони решение, если оно тестирует только unit sanitizer, использует fake Sentry client вместо fake transport, делает context опциональным, сохраняет автоматический HTTP context, обещает распознавание произвольного секрета или измеряет JavaScript characters вместо UTF-8 bytes. Проверь, что caller-facing метод остаётся синхронным best-effort, release `n/a` не включает SDK, `server.ts` действительно импортирует публичный API, а no-op мутация тела `capture` ломает тест.

## Activity Log

- 2026-08-11T13:07:04Z – codex – shell_pid=30352 – Assigned agent via action command
- 2026-08-11T13:40:04Z – codex – shell_pid=30352 – Реализация завершена: RED 2/6 затем GREEN 9/9; mutation oracle поймал снятие beforeSend; npm ci, build:tests, lint:server, build:server, полный build и diff-check прошли; сеть, DSN, push и deploy не использовались.
- 2026-08-11T13:42:40Z – codex – shell_pid=30640 – Started review via action command
- 2026-08-11T13:54:26Z – codex – shell_pid=30640 – Review cycle 1: требуется устранить dead production module, покрыть публичный capture и записать T001 evidence.
- 2026-08-11T14:03:48Z – codex – Проверен baseline commit `8a5604fa69f45898c3c18c4ac8f19104cb0e6ed5` и scoped composite fingerprint `07e62dc1c96cd92c12684e42628c444187a4d479a807da315aaa2cd29734e511`; composite совпал с `docs/codemap/codemap.lock`.
- 2026-08-11T14:03:48Z – codex – Planning delta: process caller и его regression перенесены из WP02 в WP01, добавлен deletion-safe oracle публичного `capture`; source-код не изменялся.
- 2026-08-11T14:52:02Z – codex – Cycle 2 исправлен в commit `670a3a10`: `server.ts` регистрирует testable process callback, публичный `capture` покрыт изолированным oracle; мутация no-op дала 0 passing/1 failing, после восстановления focused suite 12/12 GREEN.
- 2026-08-11T14:52:02Z – codex – `build:tests`, `lint:server`, `build:server`, полный build и `git diff --check` прошли. Full server suite: 7350 passing и один unrelated environment failure из-за отсутствующего native binding `better-sqlite3`. Production audit: три baseline high через неизменённые Vue/Webpack chains, не через `@sentry/node`; push/deploy/network event не выполнялись.
- 2026-08-11T14:25:15Z – codex – shell_pid=30348 – Started implementation via action command
- 2026-08-11T14:55:17Z – codex – shell_pid=30348 – Цикл 2: production process caller подключён, публичный capture покрыт deletion-safe oracle; focused 12/12, build:tests, lint:server, build:server и полный build прошли. Full server suite: 7350 passing и один внешний сбой отсутствующего better-sqlite3 binding. Push и deploy не выполнялись.
- 2026-08-11T14:58:00Z – reviewer-renata – shell_pid=29888 – Started review via action command
- 2026-08-11T15:19:58Z – reviewer-renata – shell_pid=29888 – Review cycle 3: подтверждены privacy bypass для leading-whitespace header и dotted credential assignment, непрямой wiring capture в server.ts и изменение порядка local log. Исходники восстановлены; пакет возвращён implementer.
- 2026-08-11T15:38:27Z – codex – shell_pid=31308 – Started implementation via action command
