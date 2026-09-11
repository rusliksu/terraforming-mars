# Implementation Plan: Distinguish stale realtime game records

**Branch**: `codex/tm-stale-realtime-gate` | **Date**: 2026-08-15 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `kitty-specs/tm-stale-realtime-gate-01M0275K/spec.md`

**Note**: This template is filled in by the `/spec-kitty.plan` command. See `src/doctrine/missions/software-dev/command-templates/plan.md` for the execution workflow.

The planner will not begin until all planning questions have been answered—capture those answers in this document before progressing to later phases.

## Summary

The promotion gate currently reports every latest `running` realtime row as an active game. Extend the existing read-only latest-save query with `created_time`, classify strictly older-than-ten-day realtime rows as `stale`, and keep fresh, unknown, malformed, and future-dated rows blocking. Preserve explicit ignored IDs, turn-based rows, ended rows, fail-closed error handling, and privacy-safe counts.

## Technical Context

<!--
  ACTION REQUIRED: Replace the content in this section with the technical details
  for the project. The structure here is presented in advisory capacity to guide
  the iteration process.

  If multiple developers/agents will work on this mission, add an "Implementation
  Concern Map" section below to decompose architectural intent into IC-## concerns
  before generating tasks.
-->

**Language/Version**: PowerShell 7 wrapper, Bash, Node.js 22 remote gate
**Primary Dependencies**: Existing `better-sqlite3` in the release runtime; Git Bash/Python fixture harness
**Storage**: SQLite production game database, opened read-only by the gate
**Testing**: `scripts/test_tm_release_guards.ps1`, dry-run parameter checks, `git diff --check`
**Target Platform**: Windows operator tooling and Linux production host
**Project Type**: Web application release tooling
**Performance Goals**: One latest-save SQLite query and one in-process classification pass; no extra remote API calls
**Constraints**: No database writes, no game payload output, fresh/unknown rows remain blocking, threshold is validated before remote execution
**Scale/Scope**: One promotion gate and its focused regression harness

## Charter Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

[Gates determined based on charter file]

## Project Structure

### Documentation (this mission)

```
kitty-specs/tm-stale-realtime-gate-01M0275K/
├── spec.md
├── plan.md
├── checklists/requirements.md
└── tasks/WP01-stale-realtime-gate.md
```

### Source Code (repository root)
<!--
  ACTION REQUIRED: Replace the placeholder tree below with the concrete layout
  for this mission. Delete unused options and expand the chosen structure with
  real paths (e.g., apps/admin, packages/something). The delivered plan must
  not include Option labels.
-->

```
scripts/promote_tm_staging_to_prod.ps1  # embedded remote SQLite gate
scripts/release_tm_prod.ps1             # operator wrapper and parameter forwarding
scripts/test_tm_release_guards.ps1      # focused Bash/Node/SQLite regression harness
```

**Structure Decision**: Keep the change at the existing promotion boundary. The remote gate remains embedded in the promotion script, the release wrapper forwards the validated policy parameter, and the focused harness exercises the exact extracted gate rather than a substitute implementation.

## Complexity Tracking

No charter violations. The implementation remains a three-file code/test scope plus mission artifacts.

## Implementation Concern Map

*Include this section when the mission has multiple distinct architectural areas that inform how tasks are decomposed.*

> **Note**: Implementation concerns are NOT work packages and are NOT executable units.
> `/spec-kitty.tasks` translates these into executable WPs — one concern may become
> multiple WPs; multiple small concerns may merge into one WP. Do not label concerns
> with WP-style IDs or sequencing language.

### IC-01 — Freshness classification

- **Purpose**: Classify the latest running realtime row using a validated ten-day save-age boundary.
- **Relevant requirements**: FR-001, FR-002, FR-004, FR-005; NFR-001, NFR-002
- **Affected surfaces**: `scripts/promote_tm_staging_to_prod.ps1`, embedded Node classifier, latest-save SQL projection
- **Sequencing/depends-on**: none
- **Risks**: A missing or invalid timestamp must remain blocking; exactly-at-boundary timestamps must remain fresh.

### IC-02 — Operator wiring and regressions

- **Purpose**: Expose the policy explicitly at the PowerShell boundary and pin the behavior with fixtures that contain no private game data in output.
- **Relevant requirements**: FR-003, FR-004, FR-005; NFR-002, NFR-003; C-001 through C-004
- **Affected surfaces**: `scripts/release_tm_prod.ps1`, `scripts/test_tm_release_guards.ps1`
- **Sequencing/depends-on**: IC-01
- **Risks**: Wrapper forwarding or dry-run replacement errors could leave the remote gate on a different policy than local validation.
