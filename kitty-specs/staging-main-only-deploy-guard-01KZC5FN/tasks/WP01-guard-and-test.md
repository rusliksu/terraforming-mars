---
work_package_id: "WP01"
title: "Guard и локальный тест"
dependencies: []
planning_base_branch: "codex/tm-staging-main-only-v2"
merge_target_branch: "codex/tm-staging-main-only-v2"
branch_strategy: "Планирование выполнено на codex/tm-staging-main-only-v2; результат остаётся в task-owned ветке."
subtasks:
  - "T001"
  - "T002"
phase: "Фаза 1 — исполняемый guard"
assignee: ""
agent: "codex"
shell_pid: ""
history:
  - timestamp: "2026-08-06T18:35:00Z"
    agent: "codex"
    action: "Русский WP создан для exact-main staging guard."
---

# Запрос рабочего пакета: WP01 — Guard и локальный тест

Реализовать и проверить `Assert-TmStagingSource` в `scripts/lib/TmReleaseGuards.ps1`, подключить его к staging path `scripts/deploy_tm_server.ps1` и добавить `scripts/test_tm_staging_source_guard.ps1`. Не менять preview/prod ветви, product code или удалённое состояние.
