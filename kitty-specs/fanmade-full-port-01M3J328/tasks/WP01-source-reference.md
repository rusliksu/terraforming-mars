---
work_package_id: WP01
title: Compose and classify the pinned source
dependencies: []
requirement_refs:
- FR-001
- FR-007
planning_base_branch: codex/fanmade-full-port
merge_target_branch: codex/fanmade-full-port
branch_strategy: Planning artifacts for this mission were generated on codex/fanmade-full-port. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/fanmade-full-port unless the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
phase: Phase 1
history: []
agent_profile: implementer-ivan
authoritative_surface: kitty-specs/fanmade-full-port-01M3J328/research/
create_intent:
- kitty-specs/fanmade-full-port-01M3J328/source-reference.md
execution_mode: planning_artifact
lane: planned
owned_files:
- kitty-specs/fanmade-full-port-01M3J328/research/**
- kitty-specs/fanmade-full-port-01M3J328/source-pins.json
- kitty-specs/fanmade-full-port-01M3J328/source-reference.md
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# WP01: Compose and classify the pinned source

## ⚡ Do This First: Load Agent Profile
Load `spk-doctrine-profile-load` for implementer-ivan (role implementer, agent codex). This does not authorize a child agent.

## Objective and context
Read `kitty-specs/fanmade-full-port-01M3J328/spec.md`, `plan.md`, `research.md`, and `source-pins.json`. Preserve the confirmed boundaries. Complete the subtasks below and their evidence.

## Branch strategy
Use the owned worktree on codex/fanmade-full-port. Runtime/finalizer lane metadata is authoritative. The eventual hosting PR targets main; never write directly to the primary checkout.

## Subtasks

### T001: Compose fanmade source with PRs 1-14
Use pinned SHA values; combine changes in a separate owned reference checkout or Git object trees. Preserve original authors and PR links. Stop on an unexpected source-head drift.
No parallel writer touches this boundary. Preserve unrelated changes.

### T002: Classify source capabilities and overlap
Annotate the complete source-files ledger with gameplay/support/target-preserved/unrelated/stub disposition and evidence. Inventory module manifests, maps/editors, custom-card libraries and non-module mechanics. Record conflict boundaries.
No parallel writer touches this boundary. Preserve unrelated changes.

### T003: Validate corrected source oracle
Run source focused regressions and build/test checks with Node 22. Record exact reference SHA and results; distinguish pre-existing source gaps from target integration. Do not change custom server code in this WP.
No parallel writer touches this boundary. Preserve unrelated changes.

## Verification and definition of done
Source pins resolve; all 14 PR patches are represented exactly once; reference compiles and relevant source regressions pass. Inspect source-only inputs and unfinished stubs. No live services or databases.

## Review guidance
Inspect actual code and before/after behavior, not only green tests. Do not mark source stubs as implemented. Keep all acceptance evidence and unresolved decisions explicit.

## Activity log
- 2026-09-27T19:00:00Z - codex - Authored from user-approved implementation plan.

