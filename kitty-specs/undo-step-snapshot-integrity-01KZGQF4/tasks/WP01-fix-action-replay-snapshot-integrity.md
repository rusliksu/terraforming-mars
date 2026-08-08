---
work_package_id: WP01
title: Fix ActionReplay Snapshot Integrity
dependencies: []
requirement_refs:
- FR-001
- FR-002
- FR-003
- FR-004
- FR-005
- FR-006
tracker_refs: []
planning_base_branch: codex/undo-step-snapshot-integrity
merge_target_branch: codex/undo-step-snapshot-integrity
branch_strategy: Planning artifacts for this mission were generated on codex/undo-step-snapshot-integrity. During /spec-kitty.implement this WP may branch from a dependency-specific base, but completed changes must merge back into codex/undo-step-snapshot-integrity unless the human explicitly redirects the landing branch.
subtasks:
- T001
- T002
- T003
- T004
- T005
phase: Phase 1 - Structural bug fix
assignee: "codex"
agent: "codex"
history:
- timestamp: '2026-08-08T13:06:23Z'
  agent: codex
  action: Prompt generated from approved scope baseline
agent_profile: implementer-ivan
authoritative_surface: src/server/game/ActionReplay.ts
create_intent: []
execution_mode: code_change
model: ''
owned_files:
- src/server/game/ActionReplay.ts
- tests/server/game/ActionReplay.spec.ts
- docs/architecture/step-undo-experiment-plan.md
role: implementer
tags: []
---

# Work Package Prompt: WP01 – Fix ActionReplay Snapshot Integrity

## ⚡ Do This First: Load Agent Profile

Load `/ad-hoc-profile-load implementer-ivan` before implementation. Apply the profile only to this bounded work package and preserve all repository and deployment gates.

## Objective

Prevent experimental one-step undo from retaining references to mutable live-game state. The completed implementation must make `ActionReplayState.rootSnapshot` an immutable value snapshot while preserving deterministic replay, prompt fingerprints, hidden-information protection and ordinary full undo.

## Context

The live incident used Giant Ice Asteroid once, then stepped back through its prompts. The board ended with the correct number of oceans, but player contribution totals contained two extra ocean steps and two extra temperature steps. Static and runtime inspection showed that `game.serialize()` returns JSON-ready data with some nested objects reused by reference. `ActionReplay` stores that result directly, so later live mutations contaminate its supposed root.

Examples of confirmed aliases include:

- `gameLog`;
- `player.globalParameterSteps`;
- `player.removingPlayers`;
- Underworld, Ares and Delta data;
- colony occupant arrays and Pathfinders VP entries;
- mutable card `data`;
- Gagarin/St. Joseph arrays and existing tile metadata.

The fix must close the alias class at the snapshot ownership boundary. Do not patch these fields separately.

## Branch Strategy

- Planning branch: `codex/undo-step-snapshot-integrity`.
- Spec Kitty merge target for this single-branch mission: `codex/undo-step-snapshot-integrity`.
- External delivery target: PR into repository branch `main`.
- Implementation runs in the existing task-owned worktree allocated by the repository workflow, not in the user's dirty primary checkout.
- No other WP exists, so there is no safe parallel write lane.

## T001 — Root snapshot mutation-isolation regression

### Purpose

Create a test that fails because the captured root changes after live state mutates. This is the direct contract test for FR-001 and FR-004.

### Guidance

1. Extend `tests/server/game/ActionReplay.spec.ts` using existing `testGame` setup.
2. Put the game into an ordinary action prompt and call `prepareActionReplayEntry` so a real `ActionReplayState` is created.
3. Capture expected JSON values from `rootSnapshot` before mutating live state.
4. Mutate at least these three categories through normal or representative live objects:
   - append a game log entry;
   - increment the active player's `globalParameterSteps`;
   - mutate one nested JSON object/array that is serialized by direct reference, preferably player Underworld data or `removingPlayers`.
5. Assert that the stored root values remain exactly the pre-mutation values.
6. Avoid a test that only asserts `!==` object identity: the observable serialized content must remain unchanged.

### RED evidence

Run only `ActionReplay.spec.ts` before changing production code. Record the assertion delta showing that the current shallow root changed.

## T002 — Giant Ice Asteroid behavioral regression

### Purpose

Protect the actual incident, not just the internal ownership mechanism.

### Guidance

1. Build a deterministic game state where the active player can resolve Giant Ice Asteroid.
2. Drive inputs through the same `prepareActionReplayEntry` → `player.process` → `recordAcceptedActionReplayEntry` path used by existing tests.
3. Complete its temperature increase, first ocean, second ocean and plant-removal choice far enough to obtain multiple replay entries.
4. Step back to the second-ocean prompt, choose an alternate valid ocean, and complete/revalidate the replayed state.
5. Assert observable outcomes:
   - exactly two new ocean tiles remain from the card;
   - temperature changed by the card's actual two steps only;
   - the player's ocean and temperature contribution counters increased by two each, not four;
   - logs contain no second uncanceled copy of the replayed global changes.
6. If the whole card flow is prohibitively coupled, keep a focused multi-input flow that exercises the same global-parameter mutations and explain the narrowed fixture in the test name. Do not replace the observable regression with identity checks alone.

### Constraints

- Do not change card rules or seed production code for the test.
- Preserve hidden-information behavior.
- One focused scenario is preferred over a large matrix of similar cases.

## T003 — Detached root capture

### Purpose

Implement the smallest structural correction after both new tests are RED.

### Guidance

1. In `src/server/game/ActionReplay.ts`, deep-copy the result of `game.serialize()` at the moment a new root journal is created.
2. Use the existing JSON-compatible serialization contract already used by `replayActionInputs`.
3. Prefer a small local helper only if it removes duplicate clone syntax cleanly without hiding behavior; do not add a general utility module for one caller.
4. Keep the later per-replay clone. It protects the immutable root from mutations performed by `Game.deserialize()` and simulated input processing.
5. Do not modify `Game.serialize()`, `Player.serialize()` or expansion serializers.
6. Do not alter prompt fingerprint calculation, entry grouping, log restoration or hidden-information checks.

### Expected shape

The root stored in `ActionReplayState` must be a detached `SerializedGame`. Whether implemented inline or through a local function, the capture must make ownership obvious in code review.

## T004 — Architecture documentation

### Purpose

Make the root ownership invariant explicit so future work does not restore shallow capture.

### Guidance

Update `docs/architecture/step-undo-experiment-plan.md` near the root snapshot/replay design:

- define root as JSON-detached and immutable after capture;
- explain why serializers are allowed to return JSON-ready structures that still need detachment at this boundary;
- state that every replay receives its own clone;
- mention regression coverage for global contributions, logs and nested expansion/card state;
- preserve the document's experimental and hidden-information caveats.

Do not rewrite unrelated historical sections.

## T005 — Verification and review

### Focused gate

```powershell
npx mocha --import=tsx --require tests/testing/setup.ts tests/server/game/ActionReplay.spec.ts
```

### Broader gates

Run repository-supported equivalents for:

```powershell
npm run lint:server
npm run build:tests
git diff --check
```

Run any more focused Giant Ice Asteroid/server test file discovered during implementation. If a broad command fails because of a missing generated baseline asset, classify it with exact evidence, generate only through the repository's normal command if safe, and rerun; do not hide the failure.

### Manual review

- Diff allowlist contains the three owned implementation surfaces plus mission artifacts only.
- No production change outside `ActionReplay.ts`.
- No dependency or serialized schema change.
- Existing Project Eden and Hi-Tech Lab replay scenarios remain green.
- Performance adds one root-capture JSON round-trip, not repeated field clones.

## Definition of Done

- [ ] Both regressions were observed RED before production changes.
- [ ] All `ActionReplay.spec.ts` tests are GREEN afterward.
- [ ] Root snapshot cannot be mutated through live game aliases.
- [ ] Giant Ice Asteroid contributions and board state are counted once.
- [ ] Existing deterministic and hidden-information cases pass.
- [ ] Architecture document matches implementation.
- [ ] Server lint/build and diff checks pass or any unrelated environment blocker is documented with exact evidence.
- [ ] Changes are committed on the task-owned branch and prepared as a PR to `main`.
- [ ] No staging or live/prod mutation is performed as part of this WP.

## Reviewer Guidance

Review the boundary, not only the incident field. Reject a patch that clones only `globalParameterSteps` or `gameLog`, or that changes `Game.serialize()` globally without new approval. Confirm the regression would fail if root capture returned to a shallow serialized graph. Confirm hidden-information tests remain meaningful and were not relaxed.


## Activity Log

- 2026-08-08T13:11:51Z – codex – Approved scope; implementing in pre-existing task-owned Windows worktree because primary checkout is dirty and charter/workspace bootstrap is unavailable.
