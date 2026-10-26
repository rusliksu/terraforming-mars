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
- [x] T007 Remove the pre-`npm ci` test dependency and verify both PR CI event paths.

## Closeout

- Implementation commits: `af7e0b773fb8904616360a9bbd1e1cf649e22865`, `ee991275a6507bfabddb47e653d38d91be354a75`.
- Draft proof: `rusliksu/terraforming-mars#121` at `ee991275a6507bfabddb47e653d38d91be354a75`.
- Both push and pull-request CI runs passed on Linux, Windows, and Docker; the formerly failing Windows `Test release guardrails` step passed in both runs.
- The focused release-guard suite passed twice without a `node_modules` override, and a mutation of the production SQL predicate was caught by the independent SQLite fixture.

Mission acceptance is complete. Merge, staging, and prod remain separate gates.
