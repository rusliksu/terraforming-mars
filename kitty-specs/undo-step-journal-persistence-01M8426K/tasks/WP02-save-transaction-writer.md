---
work_package_id: WP02
title: Replay Journal Save Transaction Writer
dependencies: [WP01]
requirement_refs:
  - FR-001
  - FR-005
  - FR-006
  - FR-009
planning_base_branch: spec/undo-step-journal-persistence
merge_target_branch: spec/undo-step-journal-persistence
subtasks:
  - T004
  - T005
  - T006
phase: Phase 1 - Persistence
assignee: codex
agent: codex
---
# WP02 — Запись журнала в транзакции сохранения

**Mission**: undo-step-journal-persistence-01M8426K
**Requirements**: FR-001, FR-005, FR-006, FR-009
**Dependencies**: WP01

## Цель

Сохранять журнал вместе с партией в одной транзакции, только для партий с `undoStepOption: true`.

## Область изменений

- `src/server/database/GameLoader.ts` / `Database.saveGame` (точка сохранения).
- `src/server/game/ActionReplay.ts` — маппинг runtime-состояния в строки.
- `src/server/database/ReplayJournal.ts`.

## Шаги

1. В транзакции сохранения: если `undoStepOption` включён и журнал не пуст — заменить head и записи журнала.
2. Ограничить количество записей 32 в той же транзакции (удаление старых).
3. Перезапись журнала на границах действия: `resetBeforeNextInput`, смена актора, новый корень.
4. Очистка записей при завершении партии (вместе с удалением сохранений).
5. Счётчик `replay_saved`; рубильник `TM_DISABLE_REPLAY_JOURNAL=1` отключает запись.
6. Не менять legacy-путь отката действия.

## Acceptance

- После `saveGame` партии с опцией журнал существует; для партии без опции таблицы пусты.
- При исключении после вставки записей журнал не изменён.
- Запись не влияет на `lastSaveId` и `undoCount`.
- Тесты: транзакционность, изоляция опций, счётчик.

## Вне области

- Восстановление журнала (WP03).
- Замер производительности (WP04).
