---
work_package_id: WP01
title: Зафиксировать evidence takeover и rolling outcome
dependencies: []
requirement_refs:
- FR-001
- FR-002
- FR-003
- FR-005
- FR-006
tracker_refs:
- tmgsp-ifq
planning_base_branch: codex/player-reliability-badge
merge_target_branch: codex/player-reliability-badge
subtasks:
- T001
- T002
- T003
phase: Phase 1 - Server contract
assignee: codex
agent: codex
agent_profile: implementer
authoritative_surface: src/server/
execution_mode: code_change
owned_files:
- src/server/bot/BotTakeoverManager.ts
- src/server/routes/ApiBotTakeover.ts
- src/server/database/GameLoader.ts
- src/server/elo/EloSyncService.ts
- tests/server/EloSyncService.spec.ts
- tests/routes/ApiBotTakeover.spec.ts
tags:
- reliability
- elo-compatible
- server
---

## Цель

Сохранить подтверждённое событие takeover в состоянии игры и классифицировать
его при normal completion без изменения Elo arithmetic.

## Ограничения

- Не считать обычный pass или временный takeover ливом.
- Не читать и не добавлять private hands, credentials или auth content.
- Не менять UI и client files в этом WP.

## Проверка

- focused server tests на start/stop/restart/completion;
- rolling FIFO window ровно 20 known outcomes;
- Elo values до и после расчёта совпадают для одинакового input.

## Реализация

- `Game` сериализует automated-player IDs и pending human takeover IDs;
- start/stop route сохраняет pending state, а stop после рестарта может очистить
  его без живого child-процесса;
- `EloSyncService` пишет `completionOutcome` отдельно от Elo arithmetic и
  считает только последние 20 известных исходов.
