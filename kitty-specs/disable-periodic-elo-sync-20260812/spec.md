# Mission Specification: Disable Periodic ELO Sync

## Intent

Production releases must not leave the legacy five-minute `tm-sync-elo.timer` polling the live SQLite database. Normal multiplayer ELO continues to update from the existing `GameLoader.completeGame()` event after the game is saved and marked finished.

## Requirements

| ID | Requirement | Status |
|---|---|---|
| FR-001 | Production deploy and staging-to-production promotion disable and stop `tm-sync-elo.timer`. | Approved |
| FR-002 | An already running `tm-sync-elo.service` reconciliation is stopped before release preparation continues. | Approved |
| FR-003 | Release paths verify the timer is inactive and disabled or masked, and the oneshot service is inactive. | Approved |
| FR-004 | Missing legacy units are accepted without mutation. | Approved |
| FR-005 | Exact-artifact no-op promotion also repairs the invariant. | Approved |
| C-001 | Preserve `tm-elo.service`, the event-driven completion hook, and the Python helper for explicit reconciliation. | Approved |
| C-002 | Staging deploy behavior is unchanged. | Approved |
| C-003 | No staging or production mutation, push, or merge belongs to this implementation package. | Approved |

## Acceptance scenarios

1. An active and enabled legacy timer is stopped, disabled, and verified before production release work proceeds.
2. A timer that remains enabled or active fails the production release closed.
3. Hosts without the legacy units continue normally.
4. The same invariant implementation is embedded in direct deploy and staging promotion.
5. The existing event-driven `EloSyncService.recordCompletedGame()` source is unchanged.

## Evidence source

On 2026-08-12, 40 of 45 player inputs delayed over one second occurred inside five-minute `tm-sync-elo.service` windows. The Python reconciliation read the live 7.1 GB SQLite database while `saveGame()` logged `SQLITE_BUSY`; the production server already contained the event-driven completion hook.
