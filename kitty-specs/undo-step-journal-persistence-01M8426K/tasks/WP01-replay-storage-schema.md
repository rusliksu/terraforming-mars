---
work_package_id: WP01
title: Схема и repository журнала
dependencies: []
requirement_refs:
- FR-002
- FR-003
- FR-010
- NFR-002
planning_base_branch: spec/undo-step-journal-persistence
merge_target_branch: spec/undo-step-journal-persistence
branch_strategy: Planning artifacts for this mission were generated on spec/undo-step-journal-persistence. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into spec/undo-step-journal-persistence unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-undo-step-journal-persistence-01M8426K
base_commit: 8e168d06a26d3e829e0b79c942b9f066fdbb8b4b
created_at: '2026-11-23T11:40:49.187947+00:00'
subtasks:
- T001
- T002
- T003
phase: Phase 1 — хранение журнала
history: []
agent_profile: reviewer-renata
authoritative_surface: src/server/database/
create_intent: []
execution_mode: code_change
owned_files:
- src/server/database/**
- tests/server/database/**
tags: []
tracker_refs: []
---
---
work_package_id: WP01
title: Replay Journal Storage Schema
dependencies: []
requirement_refs:
- FR-002
- FR-003
- FR-010
- NFR-002
planning_base_branch: spec/undo-step-journal-persistence
merge_target_branch: spec/undo-step-journal-persistence
branch_strategy: Planning artifacts for this mission were generated on spec/undo-step-journal-persistence. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into spec/undo-step-journal-persistence unless the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
phase: Phase 1 - Persistence
history: []
authoritative_surface: ''
create_intent: []
execution_mode: code_change
owned_files:
- src/server/database/**
- tests/server/database/**
tags: []
tracker_refs: []
---
# WP01 — Схема и repository журнала шагового отката

**Mission**: undo-step-journal-persistence-01M8426K
**Requirements**: FR-002, FR-003, FR-009, FR-010, NFR-002
**Dependencies**: none

## Цель

Добавить аддитивную схему хранения журнала и изолированный слой доступа, не меняя поведение существующих партий.

## Область изменений

- `src/server/database/` — миграции для PostgreSQL и SQLite.
- Новый repository-модуль (например `src/server/database/ReplayJournal.ts`).
- Тесты в `tests/server/database/`.

## Шаги

1. Добавить таблицы:
   - `game_action_replay(gameId, seq, rootSaveId, actorId, promptFingerprint, inputJson, logStartIndex, continuesThroughNextInput, createdAt)`, PK `(gameId, seq)`;
   - `game_action_replay_head(gameId, rootSaveId, currentActorId, currentPromptFingerprint, resetBeforeNextInput, lastStepBackLogStartIndex, updatedAt)`, PK `gameId`.
2. Реализовать API repository: `readHead`, `readEntries`, `replaceEntries`, `clear`, с сохранением лимита 32.
3. Не подключать repository к пути сохранения — только слой и тесты.
4. Модульные тесты: round-trip, лимит 32 (вытеснение), пустой журнал, отсутствующий head.

## Acceptance

- Миграции применяются на чистой базе и на базе с существующими партиями.
- Для партии без записей чтение возвращает `null`/пустой массив без исключений.
- Запись 40 записей оставляет последние 32.
- `npm run test:server -- --grep ReplayJournal` и `npm run test:integration` зелёные по затронутым файлам.

## Вне области

- Запись журнала при сохранении партии (WP02).
- Восстановление при загрузке (WP03).
