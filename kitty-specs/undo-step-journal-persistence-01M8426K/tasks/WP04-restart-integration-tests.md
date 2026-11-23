---
work_package_id: WP04
title: Интеграционные тесты на рестарт
dependencies:
- WP02
- WP03
requirement_refs:
- NFR-001
- NFR-004
planning_base_branch: spec/undo-step-journal-persistence
merge_target_branch: spec/undo-step-journal-persistence
branch_strategy: Planning artifacts for this mission were generated on spec/undo-step-journal-persistence. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into spec/undo-step-journal-persistence unless the human explicitly redirects the landing branch.
subtasks:
- T009
- T010
phase: Phase 4 — доказательство
history: []
agent_profile: reviewer-renata
authoritative_surface: tests/integration/
create_intent: []
execution_mode: code_change
owned_files:
- tests/integration/**
tags: []
tracker_refs: []
---
---
work_package_id: WP04
title: Replay Journal Restart Integration Tests
dependencies:
- WP02
- WP03
requirement_refs:
- NFR-001
- NFR-004
planning_base_branch: spec/undo-step-journal-persistence
merge_target_branch: spec/undo-step-journal-persistence
branch_strategy: Planning artifacts for this mission were generated on spec/undo-step-journal-persistence. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into spec/undo-step-journal-persistence unless the human explicitly redirects the landing branch.
subtasks:
- T009
- T010
phase: Phase 1 - Persistence
history: []
authoritative_surface: src/
create_intent: []
execution_mode: code_change
owned_files:
- src/**
tags: []
tracker_refs: []
---
# WP04 — Интеграционные тесты на рестарт

**Mission**: undo-step-journal-persistence-01M8426K
**Requirements**: FR-004, FR-007, NFR-001, NFR-004; AC-1…AC-9
**Dependencies**: WP02, WP03

## Цель

Доказать поведение на реальной PostgreSQL с эмуляцией рестарта и измерить задержку сохранения.

## Шаги

1. T-1: два шага, сброс кэша `GameLoader`, восстановление, успешный откат, совпадение `stateHash`.
2. T-2: дрейф fingerprint — `replay_dropped_fingerprint`, партия играбельна.
3. T-3: удалённое корневое сохранение — `replay_dropped_missing_root`.
4. T-4: 40 шагов — остаются 32, граница доступного отката корректна.
5. T-5: исключение после вставки — журнал не изменён.
6. T-6: партия без `undoStepOption` — таблицы пусты.
7. T-7: два рестарта подряд без новых шагов — журнал сохраняется.
8. T-10: замер p95 задержки сохранения с журналом и без (порог: +5 мс).

## Acceptance

- Все тесты зелёные на `npm run test:integration`.
- Замер p95 укладывается в NFR-001 или содержит обоснование и follow-up.
- Тесты не используют продовые базы и внешние сервисы.

## Вне области

- Клиентский тест (WP05).
