---
work_package_id: WP05
title: Verify combined delivery and staging
dependencies:
- WP04
requirement_refs:
- FR-001
- FR-002
- FR-003
- FR-004
- FR-005
- FR-006
- FR-007
- FR-008
planning_base_branch: codex/fanmade-full-port
merge_target_branch: codex/fanmade-full-port
branch_strategy: Planning artifacts for this mission were generated on codex/fanmade-full-port. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/fanmade-full-port unless the human explicitly redirects the landing branch.
base_branch: kitty/mission-fanmade-full-port-01M3J328
base_commit: 42e2d4f6614da2ad414dba59bdab111b3ec799cb
created_at: '2026-10-03T11:19:40.432343+00:00'
subtasks:
- T014
- T015
- T016
phase: Phase 5
history: []
agent_profile: implementer-ivan
authoritative_surface: tools/fanmade-port/
create_intent:
- tools/fanmade-port/verify.mjs
execution_mode: code_change
lane: planned
owned_files:
- tools/fanmade-port/**
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# WP05: Verify combined delivery and staging

## ⚡ Do This First: Load Agent Profile
Load `spk-doctrine-profile-load` for implementer-ivan (role implementer, agent codex). This does not authorize a child agent.

## Objective and context
Read `kitty-specs/fanmade-full-port-01M3J328/spec.md`, `plan.md`, `research.md`, and `source-pins.json`. Preserve the confirmed boundaries. Complete the subtasks below and their evidence.

## Branch strategy
Use the owned worktree on codex/fanmade-full-port. Runtime/finalizer lane metadata is authoritative. The eventual hosting PR targets main; never write directly to the primary checkout.

## Subtasks

### T014: Run combined Node 22 validation
Implement a bounded verification runner at tools/fanmade-port/verify.mjs with actual command exit codes. Full lint, server/client build, test compilation and both suites; bounded per-module actions/generation/scoring/save scenarios and representative combinations. Store actual exit codes and source SHA.
No parallel writer touches this boundary. Preserve unrelated changes.

### T015: Review and deliver through PR
Perform focused review for lost custom behavior, gated content, input sequencing and saved state. Verify immutable head, required CI, review blockers and mergeability before PR merge to custom main.
No parallel writer touches this boundary. Preserve unrelated changes.

### T016: Verify staging under existing release gates
Read current deployment rules and use clean exact-origin/main release checkout, snapshot/lock/drift checks and postdeploy browser/API evidence. Never replace incompatible occupied staging or mutate production. Keep acceptance pending at an external gate.
No parallel writer touches this boundary. Preserve unrelated changes.

## Verification and definition of done
All requirements have evidence, source stubs disclosed, exact target head verified on staging. No production deployment. Mission acceptance must not claim an unperformed gate.

## Review guidance
Inspect actual code and before/after behavior, not only green tests. Do not mark source stubs as implemented. Keep all acceptance evidence and unresolved decisions explicit.

## Activity log
- 2026-09-27T19:00:00Z - codex - Authored from user-approved implementation plan.


