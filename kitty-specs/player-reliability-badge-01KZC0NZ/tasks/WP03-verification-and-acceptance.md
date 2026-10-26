---
work_package_id: WP03
title: Проверить и принять статистику доигрываемости
dependencies:
- WP01
- WP02
requirement_refs:
- FR-001
- FR-003
- FR-004
- FR-005
- FR-006
- FR-007
tracker_refs:
- tmgsp-ifq
planning_base_branch: codex/player-reliability-badge
merge_target_branch: codex/player-reliability-badge
subtasks:
- T005
- T006
phase: Phase 3 - Verification and handoff
assignee: codex
agent: codex
agent_profile: reviewer
authoritative_surface: tests/
execution_mode: code_change
owned_files:
- tests/server/EloSyncService.spec.ts
- tests/routes/ApiBotTakeover.spec.ts
- tests/client/components/overview/PlayerEloBadge.spec.ts
- tests/client/utils/Elo.spec.ts
tags:
- reliability
- verification
- staging-only
---

## Цель

Доказать acceptance criteria, проверить diff и подготовить task-owned PR или
staging smoke без live/prod действий.

## Проверка

- targeted server/client tests;
- relevant build и `git diff --check`;
- explicit check that Elo arithmetic and existing response fields are intact;
- staging smoke only after read-only snapshot and green checks.

## Выполнено в task-owned worktree

- `npm run build:server` и `npm run build:tests` — успешно;
- `npm run test:client` — 577 passing;
- targeted server tests — успешно;
- `npm run test:server` — 7331 passing; два независимых environment-only сбоя
  (`better-sqlite3` native binding и отсутствующий `build/sw.js`);
- `git diff --check`, targeted ESLint и stylelint — успешно.
- Staging smoke не выполнялся: это отдельный delivery gate, prod/live не
  затрагивались.

## Gate

Prod/live deploy, restart, database migration, upstream publication и cleanup
чужих worktree не входят в WP.
