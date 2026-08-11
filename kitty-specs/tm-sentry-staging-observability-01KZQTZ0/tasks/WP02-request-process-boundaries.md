---
work_package_id: WP02
title: Request и process boundaries
dependencies:
- WP01
requirement_refs:
- FR-002
- FR-004
- FR-006
- FR-007
- FR-008
- FR-009
tracker_refs: []
planning_base_branch: codex/tm-sentry-staging-observability
merge_target_branch: codex/tm-sentry-staging-observability
branch_strategy: Planning artifacts were generated on codex/tm-sentry-staging-observability. This WP branches from the accepted WP01 lane via lanes.json and may run in parallel with WP03; completed changes must merge back into codex/tm-sentry-staging-observability. External delivery remains a separate PR to main.
subtasks:
- T007
- T008
- T009
- T010
- T011
phase: Фаза 2 — верхнеуровневые границы
assignee: ''
agent: codex
history:
- timestamp: '2026-08-11T08:54:36Z'
  agent: codex
  action: Пакет сформирован для единственного владения request/process capture после WP01.
agent_profile: node-norris
authoritative_surface: src/server/
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- src/server/server.ts
- src/server/server/requestProcessor.ts
- tests/server/requestProcessor.spec.ts
- tests/server/server/SentryProcessBoundary.spec.ts
role: implementer
tags: []
---

# Запрос рабочего пакета: WP02 — Request и process boundaries

## ⚡ Do This First: Load Agent Profile

Загрузи `/ad-hoc-profile-load node-norris` до чтения остальных материалов и реализации. Применяй профиль только к этому bounded work package; не меняй общий reporter contract, PlayerInput или delivery state.

## Цель

Подключить готовый `SentryReporter` к двум верхнеуровневым границам неожиданных серверных ошибок:

- внешнему catch внутри `processRequest` для request-scoped ошибок;
- существующему `uncaughtException` listener для process-scoped ошибки.

Каждый flow формирует ровно одно событие, всегда передаёт обязательный boundary и сохраняет прежнее локальное логирование, HTTP status/body и неблокирующий control flow.

## Контекст

Текущий поток запроса разделён между `processRequest(req, res)` в `src/server/server/requestProcessor.ts` и `.catch(...)` у вызова `processRequest` в `src/server/server.ts`. В одобренном ownership-решении capture request error принадлежит только внешнему catch самого `processRequest`; верхний `requestHandler` отвечает за прежний 500-response и не должен отправлять второй event.

Process-level listener уже существует в `server.ts`. Его нужно дополнить минимальным `{boundary: 'process'}`, не добавляя `unhandledRejection` listener и не меняя process exit/recovery semantics.

Request context разрешает только method и нормализованный pathname. Запрещено передавать raw `req.url`, Host, headers, cookies, query, IP, user-agent, Request/Response или общий route Context.

## Стратегия веток

- Planning branch: `codex/tm-sentry-staging-observability`.
- Spec Kitty merge target: `codex/tm-sentry-staging-observability`.
- Dependency: принятый WP01 с неизменяемым `capture(error, context)` contract.
- Реализация запускается командой `spec-kitty agent action implement WP02 --agent codex`.
- Execution worktree и dependency base брать из lane в `lanes.json`.
- WP02 безопасно параллелен WP03: owned files не пересекаются.
- External delivery позже выполняется отдельным PR в `main`; здесь push/deploy/live запрещены.

## T007 — RED request ownership regression

### Назначение

Зафиксировать реальную owning boundary и предотвратить дубли при прохождении одной ошибки через несколько catch levels.

### Руководство

1. Расширь `tests/server/requestProcessor.spec.ts` существующим HTTP mock/ServeAsset pattern.
2. Спровоцируй неожиданную error внутри route handler так, чтобы она достигла внешнего catch `processRequest`.
3. Подмени только стабильный reporter seam или transport observation; не копируй classification/privacy logic WP01 в тест.
4. Проверь ровно один вызов с:
   - исходной error identity;
   - `boundary: 'request'`;
   - нормализованным HTTP method;
   - pathname без query и fragment.
5. Добавь URL с query sentinel и Host/IP-like values; ни одно из них не должно попасть в переданный structural context.
6. Проверь, что ошибка продолжает подниматься туда же, куда до интеграции, чтобы `requestHandler` сохранил прежний 500 path.

### RED evidence

До source edit тест должен падать из-за отсутствующего reporter call, а не из-за некорректной HTTP fixture.

## T008 — RED process boundary regression

### Назначение

Зафиксировать process-level capture без загрязнения глобальных listeners и без нового rejection behavior.

### Руководство

1. Создай `tests/server/server/SentryProcessBoundary.spec.ts` либо минимально экспортируемый внутренний handler seam, если прямой import `server.ts` запускает server side effects.
2. Тест должен упражнять тот же callback, который регистрируется через `process.on('uncaughtException', ...)`, а не дублировать его logic в fixture.
3. Проверь один reporter call с исходной error и ровно `{boundary: 'process'}`.
4. Подтверди, что прежнее local logging всё ещё вызывается.
5. Снимай baseline количества `uncaughtException`/`unhandledRejection` listeners и восстанавливай его в cleanup, даже при failed assertion.
6. Отдельно докажи, что новый `unhandledRejection` listener не появился.

### Тестируемость

Если нужен export callback, сделай его internal/testable и сохрани регистрацию один раз в production module. Не вводи отдельный process-observability class или dependency injection container.

## T009 — Request integration

### Назначение

Добавить capture в точку, где доступны method/path и где ownership не создаёт повторной отправки.

### Руководство

1. Импортируй reporter из WP01 в `requestProcessor.ts`.
2. Внешний catch `processRequest` классифицирует ошибку:
   - unexpected error вызывает capture;
   - `AppError`, `InputError` и помеченный malformed JSON не вызывают capture согласно текущему plan;
   - исходная error продолжает прежний propagation/response flow.
3. Сформируй route через стандартный URL/path parser, передавая только pathname; при невозможности безопасного parse поле route отсутствует, а не использует raw URL.
4. Передай только `{boundary: 'request', method?, route?}`.
5. Не прикладывай request body, headers, cookies, query, IP, Host или Context.
6. Не добавляй capture в `requestHandler` после rejected `processRequest` promise.

### Ownership invariant

Одна и та же request error не должна пройти и через request capture, и через process-level capture в рамках нормального promise rejection. Process boundary предназначена только для действительно uncaught exception.

## T010 — Process integration

### Назначение

Дополнить существующий listener минимальным best-effort вызовом без изменения поведения процесса.

### Руководство

1. Сохрани существующий `process.on('uncaughtException', ...)` и локальный log order, если нет доказанной причины менять его.
2. Вызови `capture(err, {boundary: 'process'})` один раз.
3. Не добавляй await/flush, retry, shutdown coordination или новый exit code.
4. Не регистрируй `unhandledRejection`.
5. Reporter failure не должен покинуть listener; основная гарантия находится в WP01, но caller также не должен преобразовывать error.

## T011 — GREEN и behavioral verification

### Focused tests

```powershell
npx mocha --import=tsx --require tests/testing/setup.ts tests/server/requestProcessor.spec.ts tests/server/server/SentryProcessBoundary.spec.ts
```

### Проверяемые случаи

- unexpected request error: один `request` event;
- expected `AppError`/`InputError`: ноль event при том же status/body;
- malformed JSON: ноль event и прежний response message;
- URL query/Host/IP не переданы в structural context;
- rejected `processRequest` получает прежний 500 в `requestHandler` без второго capture;
- process error: один `process` event и прежний log;
- global listeners полностью восстановлены после теста.

### Дополнительные gates

```powershell
npm run build:tests
npm run lint:server
git diff --check
```

Не выполняй реальный server smoke с DSN: локальный oracle остаётся fake transport из WP01.

## Definition of Done

- [ ] RED tests закрепили request/process call sites до source changes.
- [ ] Request capture принадлежит только внешнему `processRequest` catch.
- [ ] `requestHandler` сохраняет прежний 500 и не отправляет второй event.
- [ ] Process listener передаёт обязательный минимальный boundary и сохраняет прежний log behavior.
- [ ] Ни один structural request/header/query/IP объект не передан reporter.
- [ ] Expected и malformed paths создают ноль events при неизменных responses.
- [ ] Focused tests, test build, server lint и diff check проходят.
- [ ] WP01 reporter contract и WP03 files не изменены.
- [ ] Push, PR, merge, DSN config и deploy не выполнялись.

## Reviewer Guidance

Проверь не только число spy calls, но и реальный error propagation. Отклони capture одновременно в `requestProcessor` и `requestHandler`, передачу raw `req.url`, общий request object, новый `unhandledRejection` listener или тест, оставляющий глобальный process listener. Любая попытка изменить HTTP error schema, response text или logging policy расширяет scope.
