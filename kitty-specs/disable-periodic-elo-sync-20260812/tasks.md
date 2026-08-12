# Work Packages

## WP01: Make periodic ELO shutdown a production release invariant

**Bead**: `tm-ai-kpp`

**Owned files**: `scripts/deploy_tm_server.ps1`, `scripts/promote_tm_staging_to_prod.ps1`, `scripts/test_tm_release_guards.ps1`, this mission directory

- [x] T001 Add the shared fail-closed systemd invariant to direct production deploy.
- [x] T002 Add the same invariant to production promotion and exact-artifact no-op repair.
- [x] T003 Preserve staging behavior, `tm-elo.service`, and event-driven completion updates.
- [x] T004 Add focused active/missing/stuck-state regressions.
- [x] T005 Run parser, release guards, and diff validation.
- [x] T006 Commit the task branch and attach Bead evidence.

## Remaining gates

- Task-owned PR lifecycle.
- Separate staging validation after merge to `main`.
- Separate authorized production deploy and systemd state verification.

## Live closeout evidence

At `2026-08-12T16:35:01Z`, after the separately authorized HOSTKEY operation:

- `tm-sync-elo.timer` was `inactive`, `dead`, and `disabled`, with no next elapse.
- `tm-sync-elo.service` was inactive and had zero starts since the disable operation.
- `tm-server` and `tm-elo` were active and running; public prod and ELO endpoints returned HTTP 200.
- Completed game `g53cc922b4f2d` was present in `elo-data.json`, proving the existing game-completion path updated ELO without periodic SQLite polling.
- Installed HOSTKEY monitoring no longer listed `tm-sync-elo.timer` as critical; canonical monitoring commit: `639ba8c7ad7a19264963f6c1491917922a4c1aeb`.

The production runtime invariant is already active. Commit `f5c2370e55` still needs task-owned PR delivery so future release scripts enforce it automatically.
