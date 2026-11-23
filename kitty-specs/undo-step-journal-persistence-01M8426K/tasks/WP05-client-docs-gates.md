---
work_package_id: WP05
title: Client Test, Docs and Gates
dependencies: [WP03]
requirement_refs:
  - NFR-003
  - NFR-004
planning_base_branch: spec/undo-step-journal-persistence
merge_target_branch: spec/undo-step-journal-persistence
subtasks:
  - T011
  - T012
  - T013
phase: Phase 1 - Persistence
assignee: codex
agent: codex
---
# WP05 — Клиентский тест, документация, финальные гейты

**Mission**: undo-step-journal-persistence-01M8426K
**Requirements**: NFR-003, NFR-004; AC-1, AC-6
**Dependencies**: WP03

## Шаги

1. Клиентский тест: при восстановленном журнале `showStepBack` доступен; при `canStepBack: false` — скрыт.
2. Обновить `docs/variants/undo.md`: журнал переживает рестарт, условия fail-closed, рубильник `TM_DISABLE_REPLAY_JOURNAL`.
3. Обновить план эксперимента `docs/architecture/step-undo-experiment-plan.md` в части персистенции.
4. Гейты: `npm run test:server`, `npm run lint`, `npm run build`, `git diff --check`.

## Acceptance

- Клиентский тест зелёный (`npm run test:client`).
- Документация соответствует фактическому поведению.
- Гейты зелёные или расхождения объяснены и зафиксированы в миссии.

## Вне области

- Изменение UI сверх текущего контракта `showStepBack`.
