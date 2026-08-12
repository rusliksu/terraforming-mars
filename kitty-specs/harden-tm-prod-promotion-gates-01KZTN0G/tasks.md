# Work Packages

## WP01: Harden promotion gates

**Bead**: `tm-ai-o3t`

**Dependencies**: none
**Owned files**: `scripts/promote_tm_staging_to_prod.ps1`, `scripts/test_tm_release_guards.ps1`, this mission directory

- [x] T001 Add failing behavioral fixture for whitespace-padded realtime status.
- [x] T002 Add failing validation/wiring tests for 180-second default and explicit override.
- [x] T003 Implement status normalization at query and classification boundaries.
- [x] T004 Implement validated health-timeout parameter and retry calculation.
- [x] T005 Run focused suite, dry-run checks, and diff validation.
- [x] T006 Commit the scoped task branch and update Bead evidence.

Acceptance stops before push, merge, staging, or prod.
