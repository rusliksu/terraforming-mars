---
work_package_id: "WP02"
title: "Правила и приёмка"
dependencies:
  - "WP01"
planning_base_branch: "codex/tm-staging-main-only-v2"
merge_target_branch: "codex/tm-staging-main-only-v2"
branch_strategy: "Планирование и реализация выполняются в task-owned ветке codex/tm-staging-main-only-v2."
subtasks:
  - "T003"
  - "T004"
  - "T005"
phase: "Фаза 2 — правила и приёмка"
assignee: ""
agent: "codex"
shell_pid: ""
history:
  - timestamp: "2026-08-06T19:05:00Z"
    agent: "codex"
    action: "Русский WP закрыт после governance и regression-проверок."
---

# Запрос рабочего пакета: WP02 — Правила и приёмка

Синхронизировать `C:\Users\Ruslan\tm\AGENTS.md` и `scripts/README-staging.md` с exact-main staging guard, проверить OpenSpec/Beads/PowerShell gates и зафиксировать только разрешённые файлы. Не выполнять push, deploy, restart или prod/live действие.
