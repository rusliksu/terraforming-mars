# Рабочие пакеты: статистика доигрываемости партий

## Контракт ветки

- Planning/target branch: `codex/player-reliability-badge`
- Mission: `player-reliability-badge-01KZC0NZ`
- Tracker identity: `tmgsp-ifq`
- Integration target: task-owned PR; prod/live не входит в этот пакет.

## Индекс подзадач

| ID | Описание | WP | Статус |
| --- | --- | --- | --- |
| T001 | Получить approval target spec/plan/tasks baseline | WP01 | [x] |
| T002 | Зафиксировать takeover owner и completion outcome | WP01 | [x] |
| T003 | Добавить rolling window последних 20 known outcomes | WP01 | [x] |
| T004 | Добавить client types и нейтральную пометку порогов | WP02 | [x] |
| T005 | Выполнить server/client tests и build | WP03 | [x] |
| T006 | Провести diff review, staging smoke и acceptance handoff | WP03 | [ ] |

## WP01 — Evidence и rolling outcome

**Prompt**: `tasks/WP01-evidence-and-rolling-outcome.md`
**Приоритет**: P1
**Цель**: надёжно различать подтверждённый лив, возврат и неизвестный исход.
**Зависимости**: нет

## WP02 — Client badge

**Prompt**: `tasks/WP02-client-reliability-badge.md`
**Приоритет**: P1
**Цель**: показать агрегат без изменения Elo semantics.
**Зависимости**: WP01

## WP03 — Проверка и приёмка

**Prompt**: `tasks/WP03-verification-and-acceptance.md`
**Приоритет**: P1
**Цель**: доказать thresholds, window, restart behavior и отсутствие Elo delta.
**Зависимости**: WP01, WP02

## Approval log

- 2026-08-06 — Руслан одобрил этот spec/plan/tasks baseline; разрешена
  реализация в task-owned ветке.
- 2026-08-06 — T002–T005 выполнены; staging smoke оставлен отдельным gate,
  prod/live и публикация не выполнялись.
