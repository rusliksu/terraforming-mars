---
work_package_id: WP04
title: Prove save and advisor compatibility
dependencies:
- WP03
requirement_refs:
- FR-005
- FR-006
- FR-007
- FR-008
planning_base_branch: codex/fanmade-full-port
merge_target_branch: codex/fanmade-full-port
branch_strategy: Planning artifacts for this mission were generated on codex/fanmade-full-port. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/fanmade-full-port unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-fanmade-full-port-01M3J328
base_commit: 42e2d4f6614da2ad414dba59bdab111b3ec799cb
created_at: '2026-09-27T21:03:44.537838+00:00'
subtasks:
- T011
- T012
- T013
phase: Phase 4
history: []
agent_profile: implementer-ivan
authoritative_surface: tests/fanmade-compat/
create_intent: []
execution_mode: code_change
lane: planned
owned_files:
- tests/fanmade-compat/**
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# WP04: Prove save and advisor compatibility

## ⚡ Do This First: Load Agent Profile
Load `spk-doctrine-profile-load` for implementer-ivan (role implementer, agent codex). This does not authorize a child agent.

## Objective and context
Read `kitty-specs/fanmade-full-port-01M3J328/spec.md`, `plan.md`, `research.md`, and `source-pins.json`. Preserve the confirmed boundaries. Complete the subtasks below and their evidence.

## Branch strategy
Use the owned worktree on codex/fanmade-full-port. Runtime/finalizer lane metadata is authoritative. The eventual hosting PR targets main; never write directly to the primary checkout.

## Subtasks

### T011: Exercise old and new save boundaries
Use synthetic or authorized isolated fixtures; load pre-port saves missing new fields and preserve custom tracking data. Save/resume new fan choices and verify deterministic continuation.
No parallel writer touches this boundary. Preserve unrelated changes.

### T012: Exercise advisor and disabled-module contracts
Identify exact existing advisor/SmartBot API consumers; verify old games still work and unsupported fan capabilities are explicit. No new strategy/scoring optimization. Record any needed cross-package corrective edit with its rationale.
No parallel writer touches this boundary. Preserve unrelated changes.

### T013: Close integration defects and inventory gaps
Run cross-expansion scenarios, disabled parity and source PR reproductions. Correct confirmed defects in their owning subsystem with a regression. Disputed rules require user decision. Complete every inventory disposition.
No parallel writer touches this boundary. Preserve unrelated changes.

## Verification and definition of done
Backward compatibility and unsupported-capability behavior have executable evidence. No known defect in accepted transferred behavior remains. Cross-package fixes are sequential and explicitly recorded.

## Review guidance
Inspect actual code and before/after behavior, not only green tests. Do not mark source stubs as implemented. Keep all acceptance evidence and unresolved decisions explicit.

## Activity log
- 2026-09-27T19:00:00Z - codex - Authored from user-approved implementation plan.

