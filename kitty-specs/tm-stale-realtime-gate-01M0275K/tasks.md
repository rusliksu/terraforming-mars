# Work Packages

## WP01: Stale realtime promotion classification

**Bead**: `tm-ai-jrx`

**Dependencies**: none
**Owned files**: `scripts/promote_tm_staging_to_prod.ps1`, `scripts/release_tm_prod.ps1`, `scripts/test_tm_release_guards.ps1`, this mission directory

- [x] T001 Add focused fixtures for fresh, stale, boundary, unknown, future, and invalid timestamps before implementation.
- [x] T002 Implement read-only timestamp projection and strict ten-day stale classification while preserving ignored, turn-based, ended, and fail-closed behavior.
- [x] T003 Wire and validate the explicit stale-days policy through the release wrapper and dry-run output.
- [x] T004 Run focused release-guard tests, required build/lint checks, and diff validation; confirm no private payload output.
- [x] T005 Record verification and remaining delivery gates in the Bead and mission artifacts without pushing, merging, or deploying.
