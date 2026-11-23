# Задачи: сохранение журнала шагового отката в БД

## Subtask Index

| ID | Описание | WP | Parallel |
| --- | --- | --- | --- |
| T001 | Добавить миграции `game_action_replay` и `game_action_replay_head` для PostgreSQL и SQLite | WP01 | No |
| T002 | Реализовать repository: чтение/запись head и записей с лимитом 32 | WP01 | No |
| T003 | Покрыть repository модульными тестами (round-trip, лимит, пустая партия) | WP01 | No |
| T004 | Писать журнал внутри транзакции `saveGame` при `undoStepOption` | WP02 | No |
| T005 | Реализовать перезапись журнала на границах действия и очистку при завершении партии | WP02 | No |
| T006 | Добавить счётчики `replay_saved` и рубильник `TM_DISABLE_REPLAY_JOURNAL` | WP02 | No |
| T007 | Восстанавливать `actionReplayState` в `GameLoader` по `rootSaveId` | WP03 | No |
| T008 | Реализовать fail-closed ветки и счётчики `replay_dropped_*` | WP03 | No |
| T009 | Интеграционные тесты на рестарт T-1…T-7 (PostgreSQL) | WP04 | No |
| T010 | Замер задержки сохранения p95 (NFR-001) в интеграционном тесте | WP04 | No |
| T011 | Клиентский тест `showStepBack` после восстановления журнала | WP05 | Yes |
| T012 | Обновить `docs/variants/undo.md` и план эксперимента | WP05 | Yes |
| T013 | Финальные гейты: server tests, lint, build, `git diff --check` | WP05 | No |

## WP01 — Схема и repository журнала

**Priority**: P1
**Goal**: аддитивная схема и изолированный слой доступа, без изменения поведения партий.
**Independent test**: модульные тесты repository на round-trip, лимит 32 и пустой журнал.
**Dependencies**: none
**Prompt**: `tasks/WP01-replay-storage-schema.md`

- [ ] T001 Добавить миграции `game_action_replay` и `game_action_replay_head` для PostgreSQL и SQLite.
- [ ] T002 Реализовать repository: чтение/запись head и записей с лимитом 32.
- [ ] T003 Покрыть repository модульными тестами (round-trip, лимит, пустая партия).

## WP02 — Запись журнала в транзакции сохранения

**Priority**: P1
**Goal**: журнал сохраняется вместе с партией и не пишется для партий без `undoStepOption`.
**Independent test**: после `saveGame` записи существуют; при исключении в транзакции журнал не меняется.
**Dependencies**: WP01
**Prompt**: `tasks/WP02-save-transaction-writer.md`

- [ ] T004 Писать журнал внутри транзакции `saveGame` при `undoStepOption`.
- [ ] T005 Реализовать перезапись журнала на границах действия и очистку при завершении партии.
- [ ] T006 Добавить счётчики `replay_saved` и рубильник `TM_DISABLE_REPLAY_JOURNAL`.

## WP03 — Восстановление журнала при загрузке

**Priority**: P1
**Goal**: шаговый откат работает после рестарта; при расхождении состоянии — безопасный отказ.
**Independent test**: тест загрузки с валидным журналом восстанавливает `actionReplayState`, с испорченным — не восстанавливает и не падает.
**Dependencies**: WP01, WP02
**Prompt**: `tasks/WP03-loader-restore.md`

- [ ] T007 Восстанавливать `actionReplayState` в `GameLoader` по `rootSaveId`.
- [ ] T008 Реализовать fail-closed ветки и счётчики `replay_dropped_*`.

## WP04 — Интеграционные тесты на рестарт

**Priority**: P1
**Goal**: доказать поведение на реальной БД с эмуляцией рестарта и замерить задержку.
**Independent test**: T-1…T-7 зелёные на PostgreSQL.
**Dependencies**: WP02, WP03
**Prompt**: `tasks/WP04-restart-integration-tests.md`

- [ ] T009 Интеграционные тесты на рестарт T-1…T-7 (PostgreSQL).
- [ ] T010 Замер задержки сохранения p95 (NFR-001) в интеграционном тесте.

## WP05 — Клиентский тест, документация, гейты

**Priority**: P2
**Goal**: подтвердить клиентское поведение, обновить документацию и закрыть проверки.
**Independent test**: клиентский тест `showStepBack` зелёный, документация соответствует поведению.
**Dependencies**: WP03
**Prompt**: `tasks/WP05-client-docs-gates.md`

- [ ] T011 Клиентский тест `showStepBack` после восстановления журнала.
- [ ] T012 Обновить `docs/variants/undo.md` и план эксперимента.
- [ ] T013 Финальные гейты: server tests, lint, build, `git diff --check`.
