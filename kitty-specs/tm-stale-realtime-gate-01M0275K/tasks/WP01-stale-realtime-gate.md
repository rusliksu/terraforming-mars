---
work_package_id: "WP01"
title: "Stale realtime promotion classification"
dependencies: []
planning_base_branch: "codex/tm-stale-realtime-gate"
merge_target_branch: "codex/tm-stale-realtime-gate"
branch_strategy: "Planning artifacts were generated on codex/tm-stale-realtime-gate; completed changes remain in this task-owned branch until a PR targets main."
subtasks:
  - "T001"
  - "T002"
  - "T003"
  - "T004"
  - "T005"
phase: "Phase 1 - Gate classification and verification"
assignee: "rusliksu"
agent: "codex"
shell_pid: ""
history:
  - timestamp: "2026-08-15T08:10:00Z"
    agent: "codex"
    action: "Created after confirming the stale-record production-gate blocker."
---

# Work Package Prompt: WP01 - Stale realtime promotion classification

Implement the approved ten-day freshness policy at the existing production promotion gate. Use the latest-save `created_time` as the only liveness signal. Rows older than ten days are reported as stale and do not block on their own; fresh, unknown, malformed, and future-dated rows remain blocking. Preserve existing explicit ignored IDs, turn-based, ended, normalized-status, read-only SQLite, fail-closed, and privacy-safe output behavior.

Verification must include the focused release-guard harness, dry-run validation for default and invalid threshold values, relevant build/lint checks required by the project charter, and `git diff --check`. Do not mutate production data or execute deploy/restart/push/merge in this work package.
