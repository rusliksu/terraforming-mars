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
