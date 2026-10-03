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
- src/server/database/Cloner.ts
- tests/database/Cloner.spec.ts
- tests/routes/ApiGame.spec.ts
- tests/routes/PlayerInput.spec.ts
- src/server/cards/CustomCardRegistry.ts
- src/server/createCard.ts
- src/server/SerializedCard.ts
- src/server/SerializedPlayer.ts
- src/server/cards/Card.ts
- src/server/cards/DataDrivenCard.ts
- src/server/cards/DynamicCardState.ts
- src/server/cards/cardSerialization.ts
- src/server/cards/Deck.ts
- src/server/cards/SerializedDeck.ts
- src/server/cards/sillyfication/DeimosDoubleDown.ts
- src/server/cards/sillyfication/DeimosDoubleDownCopy.ts
- src/server/cards/sillyfication/ProjectImitators.ts
- src/server/cards/promo/SelfReplicatingRobots.ts
- src/server/cards/solaris/SelfReplicatingRobotsSolaris.ts
- src/server/cards/robantilles/OrganicWasteRecycling.ts
- src/server/cards/robantilles/UtopiaPlanitiaSpaceport.ts
- src/server/models/ModelUtils.ts
- src/common/models/AutomationCompatibility.ts
- src/common/models/GameModel.ts
- src/common/models/SimpleGameModel.ts
- src/server/bot/AutomationCompatibility.ts
- src/server/bot/BotTakeoverManager.ts
- src/server/surrender/SurrenderService.ts
- src/server/database/GameLoader.ts
- src/server/game/GameOptions.ts
- src/server/Game.ts
- src/server/Player.ts
- src/server/models/ServerModel.ts
- src/server/routes/ApiCreateGame.ts
- src/locales/ru/ui.json
- src/client/components/PlayerHome.vue
- src/client/components/create/CreateGameForm.vue
- tests/routes/ApiCreateGame.spec.ts
- tests/routes/ApiSurrender.spec.ts
- tests/database/GameLoader.spec.ts
- tests/server/bot/**
- src/common/inputs/Payment.ts
- src/server/inputs/SelectPayment.ts
- src/server/inputs/SelectCardToPlay.ts
- src/server/replay/ReplayFrame.ts
- src/server/routes/ApiCloneableGame.ts
- src/server/routes/ApiQuickGame.ts
- tests/inputs/SelectPayment.spec.ts
- tests/inputs/SelectProjectCardToPlay.spec.ts
- tests/replay/ReplayFrame.spec.ts
- tests/routes/ApiCloneableGame.spec.ts
- tests/routes/ApiQuickGame.spec.ts
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


## Sequential corrective scope

T011/T013: normalize only the two newly introduced payment fields at input parsing; preserve dynamic public card faces in replay; retain custom boards and teams in rematch/quick-game configuration. Tests remain beside their owning flows. Root is the sole writer; WP02/WP03 are complete.

T012: add public, versioned automation compatibility and guard the three owned process-launch paths before mutation. New-game pool provenance preserves legacy Pathfinders/Delta saves while marking their expanded pools unsupported. This is a compatibility boundary, not strategy work.

T011/T013 confirmed by three failing round-trip tests: preserve dynamic definitions and copied event identity across save/undo, library changes and nested storage. Add optional state sidecars to retain all legacy name-array shapes; ordinary cards retain their existing serialization and cache.

Review correction: Cloner must preserve embedded definition text/card identities while remapping actual player IDs. Synthetic name-equals-ID regression covers the collision.

## Activity Log

- 2026-09-27T21:52:44Z – codex – shell_pid=27828 – Server compatibility committed at20c6a55ed3;10966 server tests,999 client tests,build/lint/compile and390px UI passed. Bounded server review approved. T012 remains open pending user decision for separate tm-advisor consumer guard; no overall acceptance,PR,merge or staging claimed.

## Authorized external corrective package

User approved on 2026-10-03. External task-owned workspace: C:/Users/Ruslan/.codex-worktrees/tm-tierlist-fanmade-card-support-fanmade-automation-compatibility, branch codex/fanmade-automation-compatibility, base ddbb96e3177bdb3a3c93528f03aa1afb13ea524e. Sole writer: root. Bounded responsibility: bot API polling/submission and extension/advisor unavailable boundary plus focused tests, mirror synchronization and separate PR. Exact files are recorded in external-compatibility-evidence.md. No strategy or numeric score changes.
