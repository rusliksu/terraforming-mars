---
work_package_id: WP03
title: PlayerInput diagnostic context
dependencies:
- WP01
requirement_refs:
- FR-003
- FR-004
- FR-006
- FR-007
- FR-008
- FR-009
tracker_refs:
- tmsentry-q1x.3
planning_base_branch: codex/tm-sentry-staging-observability
merge_target_branch: codex/tm-sentry-staging-observability
branch_strategy: Planning artifacts for this mission were generated on codex/tm-sentry-staging-observability. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/tm-sentry-staging-observability unless the human explicitly redirects the landing branch.
subtasks:
- T012
- T013
- T014
- T015
- T016
phase: Фаза 2 — игровой diagnostic context
assignee: ''
agent: codex
history:
- timestamp: '2026-08-11T08:54:36Z'
  agent: codex
  action: Пакет сформирован для трёх поглощаемых PlayerInput error paths после WP01.
agent_profile: reviewer-renata
authoritative_surface: src/server/routes/
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- src/server/routes/PlayerInput.ts
- tests/routes/PlayerInput.spec.ts
role: reviewer
tags: []
---

# Запрос рабочего пакета: WP03 — PlayerInput diagnostic context

## ⚡ Do This First: Load Agent Profile

Загрузи `/ad-hoc-profile-load node-norris` до чтения остальных материалов и реализации. Применяй профиль только к этому bounded work package; не меняй reporter contract, request processor или game rules.

## Цель

Добавить полезный расширенный Sentry context в три неожиданных PlayerInput paths, которые иначе поглощаются или преобразуются:

1. ошибка получения игрока до чтения gameplay input — `player-get`;
2. исходная неожиданная ошибка undo до преобразования в `InputError` — `player-undo`;
3. неожиданная ошибка основного input processing — `player-input`.

Каждая граница передаёт только реально доступные method/path/raw game/player IDs и parsed gameplay input snapshot. `AppError`, `InputError` и malformed JSON остаются ожидаемыми и не отправляются. Все HTTP responses, logs и gameplay mutations остаются прежними.

## Контекст

`src/server/routes/PlayerInput.ts` сначала извлекает game/player IDs и получает player, затем читает/парсит body в `entity`, создаёт `entityForLog`, обрабатывает special undo и основной input. Текущий код имеет отдельный get-player catch, `performUndo` с преобразованием unexpected error в `InputError` и основной catch, который логирует unexpected errors.

Разрешённый gameplay input — parsed entity после recursive sanitizer WP01. Raw request body до успешного `JSON.parse` запрещён. Полное game/player состояние, player name, request headers/cookies/query/IP и произвольные throwable properties не передаются.

## Стратегия веток

- Planning branch: `codex/tm-sentry-staging-observability`.
- Spec Kitty merge target: `codex/tm-sentry-staging-observability`.
- Dependency: принятый WP01 с `ErrorDiagnosticContext` и sanitizer внутри reporter.
- Реализация запускается командой `spec-kitty agent action implement WP03 --agent codex`.
- Execution worktree и dependency base брать из lane в `lanes.json`.
- WP03 безопасно параллелен WP02; общий reporter менять нельзя.
- External delivery остаётся отдельным PR в `main`; staging/live действия запрещены.

## T012 — RED get-player regression

### Назначение

Закрепить ранний path, где gameplay input ещё не существует, но request и raw IDs уже доступны.

### Руководство

1. Расширь существующий `tests/routes/PlayerInput.spec.ts` fixture, заставив `game.getPlayerById` либо эквивалентную точку бросить unexpected `Error`.
2. Упражняй production route path, а не вызывай отдельный helper напрямую.
3. Проверь ровно один reporter call с исходной error и context:
   - `boundary: 'player-get'`;
   - method;
   - нормализованный pathname без query;
   - raw gameId/playerId;
   - без `gameplayInput`.
4. Проверь прежний response/log path для этой ошибки.
5. В fixture добавь query/header/IP sentinels и докажи, что они не передаются структурно.

### RED evidence

До source edit тест падает только из-за отсутствия capture/context, а существующий response assertion уже проходит.

## T013 — RED undo regression

### Назначение

Сохранить исходную причину неожиданной undo failure до того, как код скрывает её за ожидаемым `InputError`.

### Руководство

1. Создай deterministic undo request, который проходит parse/validation и попадает в `performUndo`.
2. Инъецируй unexpected failure на текущей DB/game retrieval boundary после того, как parsed entity доступен.
3. Проверь capture до преобразования:
   - error identity/message/stack относятся к исходной injected error;
   - `boundary: 'player-undo'`;
   - method/path/gameId/playerId присутствуют;
   - gameplay input содержит разрешённые sentinel-значения.
4. Вложи denylisted key и поддерживаемую secret/network строку в test entity; через интеграцию с WP01 проверь их отсутствие в финальном envelope либо передай это в combined oracle без повторения sanitizer logic.
5. После capture route всё ещё возвращает прежний `InputError` response; внешние catches не создают второй event.
6. Ожидаемые `AppError` и `InputError` внутри undo создают ноль events.

## T014 — RED main input и expected-classification regressions

### Назначение

Зафиксировать основной unexpected catch и отрицательные пути в одном behavior matrix.

### Руководство

Покрой минимум:

1. unexpected error из `player.process`/основного handler:
   - один `player-input` capture;
   - method/path/raw IDs;
   - parsed gameplay input snapshot;
   - прежний error response/logging;
2. `AppError`:
   - ноль capture;
   - прежний `errorId` и body;
3. `InputError`:
   - ноль capture;
   - прежний status/message;
4. malformed JSON:
   - ноль capture;
   - прежний parse failure response;
   - raw invalid body не прикладывается;
5. invalid runId path остаётся ожидаемым и не теряет текущий response contract.

Проверь count per case с полным reset spy/transport state.

## T015 — Реализация трёх contexts

### Назначение

Добавить минимальные calls в owning catches без перестройки PlayerInput control flow.

### Руководство

1. Импортируй стабильный reporter API WP01.
2. Сформируй общие method/path/gameId/playerId через маленький локальный helper только если это предотвращает три разных privacy policies; helper не должен принимать/возвращать общий request context.
3. Для `player-get` вызови capture в существующем раннем unexpected catch с boundary и доступными request/ID полями, без input.
4. Для `player-undo` вызови capture на исходной unexpected error внутри `performUndo` до `throw new InputError(...)`.
5. Для `player-input` вызови capture только в ветке, где error не является `AppError` или `InputError`.
6. Gameplay input передавай как detached parsed snapshot, чтобы последующая validation/mutation (`runId` removal, nested object edits) не меняла диагностический source.
7. Не передавай raw body, Request/Response/Context, game, player, player name, full game state или `Error.cause`.
8. Не меняй порядок save/undo/input handling, access audit, action replay или responses.

### Boundary matrix

| Boundary | Method/path | IDs | Gameplay input |
| --- | --- | --- | --- |
| `player-get` | да | да | нет |
| `player-undo` | да | да | да |
| `player-input` | да | да | да |

Отсутствующее поле не выдумывается. Route parse failure означает отсутствие route, а не raw URL fallback.

## T016 — GREEN и gameplay verification

### Focused test

```powershell
npx mocha --import=tsx --require tests/testing/setup.ts tests/routes/PlayerInput.spec.ts
```

### Проверяемые инварианты

- по одному event для get-player, undo и main unexpected cases;
- ноль event для `AppError`, `InputError`, invalid runId и malformed JSON;
- undo event содержит original error, а caller по-прежнему получает ожидаемый `InputError` response;
- input snapshot сохраняет parsed pre-mutation values и не меняется после validation/processing;
- секретные keys/signatures очищаются reporter, но разрешённые game choices остаются диагностически полезными;
- никаких изменений accepted input logs, replay, game save или player model response.

### Дополнительные gates

```powershell
npm run build:tests
npm run lint:server
git diff --check
```

Не исправляй unrelated failures в игровом коде. Зафиксируй точное evidence и вернись к owner, если WP01 contract недостаточен: самостоятельно расширять его нельзя.

## Definition of Done

- [ ] Три RED regressions наблюдались до production changes.
- [ ] Каждая поглощаемая unexpected error формирует ровно одно событие с правильным boundary.
- [ ] Expected и malformed paths формируют ноль events при прежних responses.
- [ ] Gameplay input берётся только после успешного parse и передаётся detached snapshot.
- [ ] Query/headers/IP/raw body/game/player objects не входят в context.
- [ ] Undo сохраняет исходную cause в Sentry до преобразования, но не меняет внешний API.
- [ ] Полный `PlayerInput.spec.ts`, test build, server lint и diff check проходят.
- [ ] WP01/WP02 owned files не изменены.
- [ ] Push, PR, merge, DSN config и deploy не выполнялись.

## Reviewer Guidance

Проверь placement каждого capture относительно parse, player retrieval и undo conversion. Отклони один общий внешний capture, который теряет boundary/context, capture ожидаемых errors, передачу mutable `entity` после изменения вместо detached snapshot или изменение response/gameplay semantics. Убедись, что test fixtures упражняют production route и не мокают саму классификацию.
