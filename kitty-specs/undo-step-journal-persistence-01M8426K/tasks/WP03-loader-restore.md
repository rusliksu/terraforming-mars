---
work_package_id: WP03
title: Восстановление журнала при загрузке
dependencies:
- WP01
- WP02
requirement_refs:
- FR-004
- FR-007
- FR-008
planning_base_branch: spec/undo-step-journal-persistence
merge_target_branch: spec/undo-step-journal-persistence
branch_strategy: Planning artifacts for this mission were generated on spec/undo-step-journal-persistence. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into spec/undo-step-journal-persistence unless the human explicitly redirects the landing branch.
subtasks:
- T007
- T008
phase: Phase 3 — восстановление
history: []
agent_profile: reviewer-renata
authoritative_surface: src/server/database/
create_intent: []
execution_mode: code_change
owned_files:
- src/server/database/**
- src/server/game/ActionReplay.ts
tags: []
tracker_refs: []
---
---
work_package_id: WP03
title: Replay Journal Loader Restore
dependencies:
- WP01
- WP02
requirement_refs:
- FR-004
- FR-007
- FR-008
planning_base_branch: spec/undo-step-journal-persistence
merge_target_branch: spec/undo-step-journal-persistence
branch_strategy: Planning artifacts for this mission were generated on spec/undo-step-journal-persistence. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into spec/undo-step-journal-persistence unless the human explicitly redirects the landing branch.
subtasks:
- T007
- T008
phase: Phase 1 - Persistence
history: []
authoritative_surface: src/server/
create_intent: []
execution_mode: code_change
owned_files:
- src/server/database/GameLoader.ts
- src/server/game/ActionReplay.ts
tags: []
tracker_refs: []
---
# WP03 — Восстановление журнала при загрузке

**Mission**: undo-step-journal-persistence-01M8426K
**Requirements**: FR-004, FR-007, FR-008, FR-009
**Dependencies**: WP01, WP02

## Цель

После загрузки партии шаговый откат должен работать так же, как до рестарта; при любом расхождении — безопасный отказ.

## Область изменений

- `src/server/database/GameLoader.ts` — загрузка и восстановление состояния.
- `src/server/game/ActionReplay.ts` — восстановление `ActionReplayState` из строк.

## Шаги

1. При десериализации партии с `undoStepOption` и наличием head: прочитать head и записи.
2. Проверить существование `rootSaveId` и совпадение `promptFingerprint` (`promptFingerprintForPlayer`).
3. При совпадении — собрать `ActionReplayState` (rootSnapshot из сохранения, entries из строк) и передать в игру.
4. Fail-closed: `replay_dropped_missing_root`, `replay_dropped_fingerprint`, `replay_dropped_corrupt`; состояние партии не меняется.
5. Убедиться, что партии без опции и legacy undo не затрагиваются.

## Acceptance

- Загрузка с валидным журналом восстанавливает шаговый откат.
- Все три ветки отказа дают недоступный откат, рабочую партию и счётчик причины.
- `stateHash` загруженной партии совпадает с сохранённым.

## Вне области

- Интеграционные тесты с рестартом (WP04).
