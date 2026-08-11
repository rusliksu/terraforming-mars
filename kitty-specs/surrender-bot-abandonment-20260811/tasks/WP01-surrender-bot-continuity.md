---
work_package_id: "WP01"
title: "Атомарная сдача и непрерывность бота"
dependencies: []
subtasks: ["T001", "T002", "T003", "T004", "T005", "T006"]
requirement_refs: ["FR-001", "FR-002", "FR-003", "FR-004", "FR-005", "FR-006", "FR-009", "FR-010", "FR-011", "FR-012", "NFR-001", "NFR-002", "NFR-003", "C-001", "C-002", "C-004", "C-005", "C-006"]
planning_base_branch: "main"
merge_target_branch: "main"
branch_strategy: "task-owned PR"
execution_mode: "code_change"
owned_files:
  - "docs/codemap/**"
  - "src/server/Player.ts"
  - "src/server/Game.ts"
  - "src/server/IGame.ts"
  - "src/server/SerializedGame.ts"
  - "src/server/routes/PlayerInput.ts"
  - "src/server/routes/ApiSurrender.ts"
  - "src/server/bot/BotTakeoverManager.ts"
  - "src/server/database/GameLoader.ts"
  - "tests/Player.spec.ts"
  - "tests/Game.spec.ts"
  - "tests/routes/PlayerInput.spec.ts"
  - "tests/routes/ApiSurrender.spec.ts"
  - "tests/server/bot/BotTakeoverManager.spec.ts"
authoritative_surface: "src/server/"
agent_profile: "implementer-ivan"
role: "implementer"
agent: "codex"
history:
  - "2026-08-11: baseline approved; implementation pending"
---

## ⚡ Do This First: Load Agent Profile

Load `Implementer Ivan` through `/ad-hoc-profile-load` before editing. Then read
the mission spec, plan, current AGENTS instructions and the exact `origin/main`
diff. Do not touch the dirty primary checkout or any other worktree.

## Цель

Сделать один атомарный server transition, который после подтвержденной сдачи
передает место боту, сохраняет намерение, переживает рестарт и не оставляет
игру без исполнителя обязательного prompt.

## Branch strategy

- Planning/base: `main` at the mission base SHA.
- Execution: текущий task-owned worktree и ветка
  `codex/surrender-bot-abandonment`.
- Merge target: `main` через PR.
- Staging и prod не являются частью WP implementation.

## T001 — актуальная карта кода

Перед source edits регенерировать `docs/codemap/codemap.html`, `.json` и
`.lock` по текущему checkout. Карта должна показать:

1. `Player.surrenderOption` → `PlayerInput` и audit.
2. Legacy `ApiSurrender` и его call sites.
3. `Game.surrenderedPlayerIds` → phase skipping, `gameIsOver`, GameEnd, restore.
4. `BotTakeoverManager` → create-game bots, Telegram suppression и live models.
5. `GameLoader` completion/restore boundaries.

Не cherry-pick старый `tm-codemap` commit без регенерации: он основан на
устаревшем SHA. В review evidence перечислить callers, affected flows и tests.

## T002 — сначала failing tests

Добавить focused contracts до production code:

- успешное подтверждение запускает bot manager за тот же player ID;
- видимая Surrender button и confirmation сообщают о запуске бота;
- отмена подтверждения не меняет state/process/action counters;
- missing bot script или spawn failure оставляет human-controlled state;
- save failure компенсирует уже созданный process;
- surrendered human не попадает в `botPlayerIds`;
- повторный Surrender идемпотентно отклоняется;
- чужой player capability не может запустить transition.

Тесты должны проверять observable state и manager calls, а не приватные поля
конкретной реализации.

Существующие `PlayerInput`, `Reset` и `WaitingFor` regressions для
hidden-information warning должны оставаться зелеными для Undo action и Undo
one step; не заменять их новым surrender-specific механизмом.

## T003 — один transition

Инвентаризировать два текущих пути: player action и `ApiSurrender`. Выбрать
один канонический service/transition и направить разрешенные входы через него.
Если legacy route не имеет реального caller, удалить или сузить его вместе с
route registration/tests, не оставляя второго state mutation.

Transition владеет:

- eligibility и authorization boundary;
- preflight runtime dependencies;
- persisted surrender intent;
- start/stop compensation;
- save ordering;
- sanitized audit result.

Не передавать shared game token как player ownership. Server/admin capability
остается отдельным защищенным путем.

## T004 — непрерывный игровой цикл

После успешной сдачи bot process должен играть тем же seat. Удалить старую
no-op модель surrendered seat:

- research не помечается завершенным автоматически;
- action не превращается в forced pass;
- final greenery не пропускается;
- multiplayer game не заканчивается из-за одного non-surrendered human;
- solar/WGT и другие mandatory prompts остаются обычными bot inputs.

Сохранить outcome flag для GameEnd/rating, но не использовать его как признак
того, что seat исчез из game flow.

## T005 — restore/restart reconciliation

Найти штатный момент после загрузки активных игр и идемпотентно сопоставить
persisted surrender IDs с активными manager entries.

Проверить:

- активная незавершенная игра запускает отсутствующий surrendered bot;
- уже активный entry не дублируется;
- finished game не запускает process;
- исходный bot player сохраняет существующее поведение;
- failure пишет sanitized diagnostic и остается наблюдаемым для health/support.

Не добавлять DB migration, если existing serialized optional field достаточно.

## T006 — end-to-end focused validation

Построить трехместный fixture с WGT:

1. Первый игрок подтверждает Surrender.
2. Игра доходит до solar.
3. WGT prompt получает тот же seat и отвечает бот.
4. Save/restore сохраняет intent.
5. Reconcile поднимает process после restart.

Отдельно проверить failure compensation и отмену. Запустить closest server
tests не менее трех раз; зафиксировать команды и exit codes.

## Definition of Done

- Codemap актуальна и отвечает на три обязательных вопроса.
- Существует один канонический surrender transition.
- Нет half-transition при start/save failure.
- WGT и restore сценарии защищены regression tests.
- Изменения ограничены owned files; out-of-map edit объяснен.
- WP01 не меняет rating formula, prod, live game или ELO JSON.

## Reviewer focus

- Проверить ordering side effects вокруг `player.process`, save promise и spawn.
- Убедиться, что bot process не получает чужую capability.
- Проследить отсутствие скрытого раннего game end.
- Проверить, что новый restore hook не создает duplicate child processes.
- Проверить, что изменения `PlayerInput` не обходят hidden-info confirmation.
