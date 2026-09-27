---
work_package_id: WP02
title: Adapt common models and server gameplay
dependencies:
- WP01
requirement_refs:
- FR-002
- FR-003
- FR-005
- FR-007
- FR-008
planning_base_branch: codex/fanmade-full-port
merge_target_branch: codex/fanmade-full-port
branch_strategy: Planning artifacts for this mission were generated on codex/fanmade-full-port. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/fanmade-full-port unless the human explicitly redirects the landing branch.
subtasks:
- T004
- T005
- T006
- T007
phase: Phase 2
history: []
agent_profile: implementer-ivan
authoritative_surface: src/server/
create_intent: []
execution_mode: code_change
lane: planned
owned_files:
- src/common/**
- src/server/**
- tests/*.ts
- tests/cards/**
- tests/turmoil/**
- tests/boards/**
- tests/routes/**
- tests/models/**
- tests/deferredActions/**
- tests/player/**
- tests/testing/**
- package.json
- package-lock.json
role: implementer
tags: []
task_type: implement
tracker_refs: []
---

# WP02: Adapt common models and server gameplay

## ⚡ Do This First: Load Agent Profile
Load `spk-doctrine-profile-load` for implementer-ivan (role implementer, agent codex). This does not authorize a child agent.

## Objective and context
Read `kitty-specs/fanmade-full-port-01M3J328/spec.md`, `plan.md`, `research.md`, and `source-pins.json`. Preserve the confirmed boundaries. Complete the subtasks below and their evidence.

## Branch strategy
Use the owned worktree on codex/fanmade-full-port. Runtime/finalizer lane metadata is authoritative. The eventual hosting PR targets main; never write directly to the primary checkout.

## Subtasks

### T004: Reconcile common contracts and configuration
Add source module/card/resource/tag IDs and options with disabled defaults. Keep target request types, options, card filtering and field semantics. New save properties must be backwards compatible.
No parallel writer touches this boundary. Preserve unrelated changes.

### T005: Port the server dependency closure
Import all twelve module implementations and required Game/Player/deferred-action integration. Review shared hunks semantically, including clean merges. Preserve target undo, replay, surrender, logging, shadow and request handling.
No parallel writer touches this boundary. Preserve unrelated changes.

### T006: Port boards, libraries and variants
Transfer source implemented boards, codecs, custom card/board libraries, variants and auxiliary tracks. Adapt route inputs to target validation and storage boundaries; copy no live library or DB data.
No parallel writer touches this boundary. Preserve unrelated changes.

### T007: Port tests and resolve confirmed server defects
Preserve both target regressions and relevant source tests. Reproduce failures before fixes. Verify generation, scoring, source PR fixes, dependencies and persisted choices. Keep a bug ledger with evidence.
No parallel writer touches this boundary. Preserve unrelated changes.

## Verification and definition of done
Server builds and server test compilation/execution pass for transferred behavior. Target custom invariants remain. Document client changes pending WP03; no claim of overall readiness until combined checks.

## Review guidance
Inspect actual code and before/after behavior, not only green tests. Do not mark source stubs as implemented. Keep all acceptance evidence and unresolved decisions explicit.

## Activity log
- 2026-09-27T19:00:00Z - codex - Authored from user-approved implementation plan.
