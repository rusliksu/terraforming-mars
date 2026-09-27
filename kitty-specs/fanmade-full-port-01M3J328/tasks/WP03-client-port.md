---
work_package_id: WP03
title: Integrate mechanics into the custom UI
dependencies:
- WP02
requirement_refs:
- FR-002
- FR-003
- FR-004
- FR-007
planning_base_branch: codex/fanmade-full-port
merge_target_branch: codex/fanmade-full-port
branch_strategy: Planning artifacts for this mission were generated on codex/fanmade-full-port. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/fanmade-full-port unless the human explicitly redirects the landing branch.
subtasks:
- T008
- T009
- T010
phase: Phase 3
history: []
agent_profile: implementer-ivan
authoritative_surface: src/client/
create_intent: []
execution_mode: code_change
lane: planned
owned_files:
- src/client/**
- src/styles/**
- src/locales/**
- assets/**
- tests/client/**
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# WP03: Integrate mechanics into the custom UI

## ⚡ Do This First: Load Agent Profile
Load `spk-doctrine-profile-load` for implementer-ivan (role implementer, agent codex). This does not authorize a child agent.

## Objective and context
Read `kitty-specs/fanmade-full-port-01M3J328/spec.md`, `plan.md`, `research.md`, and `source-pins.json`. Preserve the confirmed boundaries. Complete the subtasks below and their evidence.

## Branch strategy
Use the owned worktree on codex/fanmade-full-port. Runtime/finalizer lane metadata is authoritative. The eventual hosting PR targets main; never write directly to the primary checkout.

## Subtasks

### T008: Adapt creation and rendering
Add new expansions, dependencies, tags, resources, board controls, input components and source rendering assets. Retain target layout, UI improvements and log controls. Do not replace unrelated localization or ELO data.
No parallel writer touches this boundary. Preserve unrelated changes.

### T009: Integrate editors and policy reference
Expose implemented editors and library flows using target navigation. Port PR14: Policies opens all options in Chairman, only current policies otherwise; standard Turmoil remains unchanged.
No parallel writer touches this boundary. Preserve unrelated changes.

### T010: Validate interactions and responsive layouts
Port relevant source client tests; retain target tests. Run Vue types, client tests/build and desktop/390px Playwright checks of creation, editors, board and choices. Fix confirmed UI defects with regressions.
No parallel writer touches this boundary. Preserve unrelated changes.

## Verification and definition of done
No new Vue warnings/uncaught errors. Fan controls are usable on custom layout; disabled configurations retain target behavior. Existing target assets and log features remain.

## Review guidance
Inspect actual code and before/after behavior, not only green tests. Do not mark source stubs as implemented. Keep all acceptance evidence and unresolved decisions explicit.

## Activity log
- 2026-09-27T19:00:00Z - codex - Authored from user-approved implementation plan.
