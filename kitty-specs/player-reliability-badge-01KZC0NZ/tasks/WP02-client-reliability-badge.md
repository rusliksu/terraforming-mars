---
work_package_id: WP02
title: Добавить нейтральную client-пометку доигрываемости
dependencies:
- WP01
requirement_refs:
- FR-004
- FR-005
- FR-007
tracker_refs:
- tmgsp-ifq
planning_base_branch: codex/player-reliability-badge
merge_target_branch: codex/player-reliability-badge
subtasks:
- T004
phase: Phase 2 - Client presentation
assignee: codex
agent: codex
agent_profile: implementer
authoritative_surface: src/client/
execution_mode: code_change
owned_files:
- src/client/utils/elo.ts
- src/client/components/overview/PlayerEloBadge.vue
- tests/client/components/overview/PlayerEloBadge.spec.ts
- tests/client/utils/Elo.spec.ts
tags:
- reliability
- neutral-ui
- client
---

## Цель

Показать `Ливы N/M` только после server-side threshold contract и сохранить
существующие Elo/delta display semantics.

## Ограничения

- Не вводить штраф, блокировку или matchmaking effect.
- Не показывать неполный или unknown historical aggregate.
- Tooltip должен объяснять окно и пороги без моральной оценки игрока.

## Проверка

- UI thresholds на `9`, `10/2`, `10/3`, `10/4` и долю ниже/выше 20%;
- отсутствие regression в существующем Elo badge.

## Реализация

`PlayerEloBadge` показывает нейтральное `Ливы N/M` и tooltip с процентом только
при порогах `10` партий, `3` ливах и доле не ниже `20%`; Elo/delta остаются
без изменений.
