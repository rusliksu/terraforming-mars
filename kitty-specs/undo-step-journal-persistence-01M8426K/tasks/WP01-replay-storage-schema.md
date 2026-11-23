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
subtasks:
  - T001
  - T002
  - T003
phase: Phase 1 - Persistence
assignee: codex
agent: codex
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
