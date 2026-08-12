# Implementation Plan

## Design

1. Embed an idempotent `disable_periodic_elo_sync` guard in both self-contained production remote scripts.
2. Stop and disable the timer, stop an in-flight oneshot, then verify systemd state.
3. Run the guard before heavy production release preparation and after successful/no-op promotion.
4. Leave `tm-elo.service` and event-driven ELO unchanged.
5. Cover active, missing, and fail-closed systemd states in the existing release-guard harness.

## Verification

- PowerShell parser for all touched scripts.
- `pwsh -NoProfile -File scripts/test_tm_release_guards.ps1`.
- `git diff --check`.
- Empty diff for `src/server/database/GameLoader.ts` and `src/server/elo/EloSyncService.ts`.

## Delivery gates

Commit and PR are task-owned lifecycle steps. Staging and production deployment remain separate gates under the workspace production rules.
