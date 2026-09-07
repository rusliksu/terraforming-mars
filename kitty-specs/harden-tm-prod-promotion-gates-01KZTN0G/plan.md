# Implementation Plan

## Technical context

- Language: PowerShell 7 wrapper with embedded Bash and Node.js.
- Files: `scripts/promote_tm_staging_to_prod.ps1`, `scripts/test_tm_release_guards.ps1`.
- Tests: existing PowerShell regression harness executes extracted Bash/Node behavior through Git Bash.
- Landing branch: `main` through a task-owned PR.

## Design

1. Add a validated `NextServiceHealthTimeoutSeconds` PowerShell parameter, default 180, bounded to a positive whole-second value before remote execution.
2. Inject the value as a numeric remote-script constant and compute retry attempts using ceiling division by the unchanged two-second interval.
3. Normalize row status with `trim()` at the classification boundary and in the SQL predicate so padded rows are selected and then validated consistently.
4. Extend fixtures so the original implementation fails for the observed bug, while non-running/malformed values stay fail-closed.

## Invariants

- No API/live endpoint dependency is reintroduced.
- SQLite remains readonly/query-only and exhaustive over latest saves.
- Candidate health must actually pass; only its allowed wait changes.
- The second gate remains immediately before public mutation.

## Verification

Run `pwsh -NoProfile -File scripts/test_tm_release_guards.ps1`, inspect `git diff --check`, and run promotion `-DryRun` cases for default/override plus invalid parameter rejection.
