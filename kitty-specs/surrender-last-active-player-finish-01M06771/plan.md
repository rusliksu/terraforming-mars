# Implementation Plan: Finish After Last Active Player

**Branch**: `codex/tm-surrender-last-player-finish` (PR source)  
**Planning/base branch**: `main`  
**Final merge target**: `main`  
**Date**: 2026-08-17  
**Spec**: `kitty-specs/surrender-last-active-player-finish-01M06771/spec.md`

## Summary

Add a single, idempotent finalization seam to the existing explicit-surrender
flow. After the accepted surrender is persisted, the game checks whether one
and only one multiplayer player remains non-surrendered. If so, it runs the
existing end-game persistence path without starting a takeover bot. The shared
completion-ranking helper carries a last-place marker for this case so raw VP
and its breakdown remain intact while all surrendered players receive the
total-player-count place in game results and place-based ELO inputs.

## Technical Context

**Language/Version**: TypeScript 6, Node.js 22, CommonJS backend  
**Primary Dependencies**: Existing Terraforming Mars server, Mocha 11, Chai 6  
**Storage**: Existing database save/results tables and JSON ELO primary/mirror files  
**Testing**: Focused Mocha tests, then `build:tests`, `lint:server`, `build:server`, full build, and `git diff --check`  
**Target Platform**: Windows local development and Linux staging; no live mutation  
**Project Type**: Existing web application backend with Vue frontend  
**Performance Goals**: Focused local surrender-to-finished-result path completes within 1 second  
**Constraints**: Explicit surrender only; preserve `completed`/`surrendered`/`left`; no direct VP penalty; no duplicate finalization or bot start after completion  
**Scale/Scope**: One multiplayer game lifecycle path, shared ranking, ELO summary/rebuild, and focused regression fixtures for 2-, 3-, and 4-player cases

## Charter Check

PASS. The design follows the project charter: test-first focused Mocha coverage,
small TypeScript changes at the existing lifecycle/ranking seams, no new
dependency or persistence format, and no staging/live/production operation.
The task branch is `codex/tm-surrender-last-player-finish`; the authoritative
base and final merge target are both `main`.

## Design

1. `SurrenderService` remains the transaction boundary. It adds the explicit
   surrender, persists that state, invokes a game-level early-finish method,
   and starts the takeover bot only when the game did not finish.
2. `Game.finishAfterSurrender()` is a no-op for `Phase.END`, solo games, zero
   non-surrendered players, or any state other than exactly one remaining
   player. Otherwise it delegates to the existing end-game finalization path.
3. `CompletionRank` gains an optional forced-last marker used only for
   surrendered players in the last-active-player case. Comparisons keep the
   current outcome/VP/megacredit order for every other game.
4. `Game.gotoEndGame`, `buildCompletedGameSummary`, summary ingestion, and
   stored-result repair all use the same marker and assign forced-last players
   the total player count. Raw VP, megacredits, and VP breakdown are copied
   unchanged.
5. `GameLoader.completeGame` is awaited by the finalization path so the
   successful surrender response observes the persisted finished result and
   ELO recording has a single completion boundary.

## Project Structure

Implementation is limited to the existing server/common surfaces:

```
src/common/game/CompletionOutcome.ts
src/server/Game.ts
src/server/IGame.ts
src/server/surrender/SurrenderService.ts
src/server/routes/ApiSurrender.ts
src/server/elo/EloSyncService.ts
tests/Game.spec.ts
tests/routes/ApiSurrender.spec.ts
tests/server/EloSyncService.spec.ts
kitty-specs/surrender-last-active-player-finish-01M06771/
```

## Implementation Concern Map

### IC-01 — Surrender lifecycle and atomic finalization

- **Purpose**: Finish the game immediately after the last accepted surrender without bot takeover or duplicate writes.
- **Relevant requirements**: FR-001, FR-002, FR-006, FR-007, FR-008; C-001, C-004
- **Affected surfaces**: `src/server/surrender/SurrenderService.ts`, `src/server/Game.ts`, `src/server/IGame.ts`, `src/server/routes/ApiSurrender.ts`
- **Sequencing/depends-on**: none
- **Risks**: rollback must restore the serialized pre-surrender state if finalization or persistence fails; phase END must make retries fail closed.

### IC-02 — Shared completion ranking and ELO projection

- **Purpose**: Make surrendered players share the final place while retaining raw VP and existing outcome semantics.
- **Relevant requirements**: FR-003, FR-004, FR-005, FR-006, FR-007
- **Affected surfaces**: `src/common/game/CompletionOutcome.ts`, `src/server/Game.ts`, `src/server/elo/EloSyncService.ts`
- **Sequencing/depends-on**: IC-01 state predicate
- **Risks**: ordinary surrender and completed/left tie-breaks must remain byte-for-byte equivalent outside the trigger.

### IC-03 — Observable regression coverage

- **Purpose**: Prove the 2-, 3-, and 4-player early-finish behavior and preserve non-triggering flows.
- **Relevant requirements**: NFR-001, NFR-002, NFR-003, SC-001 through SC-004
- **Affected surfaces**: `tests/Game.spec.ts`, `tests/routes/ApiSurrender.spec.ts`, `tests/server/EloSyncService.spec.ts`
- **Sequencing/depends-on**: IC-01 and IC-02
- **Risks**: tests must observe persisted scores and bot-manager calls rather than only internal flags.

## Verification Plan

- Run focused Game, surrender-route, and ELO tests first (TDD red/green loop).
- Run the repository's `build:tests`, `lint:server`, `build:server`, and full
  build commands from `package.json`.
- Run `git diff --check` and inspect the final diff for only the scoped files
  plus mission artifacts.
- Do not run a live server, modify production games, update manual ELO data,
  deploy, push, or open/merge a PR unless separately authorized.
