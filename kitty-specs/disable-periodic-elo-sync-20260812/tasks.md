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

## Delivery closeout

- [x] PR #125 merged to `main` as `503b8d0b59b76cdb9e205f16f0a89048a2ee6953`.
- [x] Staging served the exact merged SHA and artifact `5f34dc2533b15bd257c9fcc88b616ac21f66a4cd211500cd6edeca09508fb3fa`; release smoke passed.
- [x] Production promotion completed after the active realtime game finished and a fresh audit verified the remaining legacy `running` rows had no accepted inputs in 24 hours.
- [x] Both preflight and before-public-switch gates reported zero non-ignored realtime games.
- [x] Independent post-deploy verification confirmed matching staging/prod manifests, healthy public endpoints, active `tm-server` and `tm-elo`, inactive `tm-server-next`, and a free deploy lock.
- [x] `tm-sync-elo.timer` remained disabled/inactive and `tm-sync-elo.service` remained inactive after the production restart.

## Live closeout evidence

At `2026-08-12T16:35:01Z`, after the separately authorized HOSTKEY operation:

- `tm-sync-elo.timer` was `inactive`, `dead`, and `disabled`, with no next elapse.
- `tm-sync-elo.service` was inactive and had zero starts since the disable operation.
- `tm-server` and `tm-elo` were active and running; public prod and ELO endpoints returned HTTP 200.
- Completed game `g53cc922b4f2d` was present in `elo-data.json`, proving the existing game-completion path updated ELO without periodic SQLite polling.
- Installed HOSTKEY monitoring no longer listed `tm-sync-elo.timer` as critical; canonical monitoring commit: `639ba8c7ad7a19264963f6c1491917922a4c1aeb`.

The production runtime and the deployed release scripts now enforce the invariant. Final delivery evidence is also recorded on Bead `tm-ai-kpp`.
