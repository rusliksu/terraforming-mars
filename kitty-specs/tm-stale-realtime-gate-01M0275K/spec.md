# Mission Specification: Distinguish stale realtime game records

**Mission Branch**: `codex/tm-stale-realtime-gate`
**Created**: 2026-08-15
**Status**: Approved
**Input**: Production promotion was blocked by a misleading count of 99 realtime games. The gate must separate stale database records from recent or unknown game state without mutating production data.

## User Scenarios & Testing *(mandatory)*

<!--
  IMPORTANT: User stories should be PRIORITIZED as user journeys ordered by importance.
  Each user story/journey must be INDEPENDENTLY TESTABLE - meaning if you implement just ONE of them,
  you should still have a viable MVP (Minimum Viable Product) that delivers value.
  
  Assign priorities (P1, P2, P3, etc.) to each story, where P1 is the most critical.
  Think of each story as a standalone slice of functionality that can be:
  - Developed independently
  - Tested independently
  - Deployed independently
  - Demonstrated to users independently
-->

### User Story 1 - Safe production promotion diagnosis (Priority: P1)
As a release operator, I want the production promotion gate to identify recent realtime games separately from stale unfinished records so that a stale database tail does not masquerade as the number of currently active games.

**Why this priority**: A misleading blocker prevents a verified release from reaching production and encourages unsafe manual bypasses.

**Independent Test**: Supply a fixture containing fresh, stale, and unknown-timestamp realtime rows and verify the gate reports each category, blocks on fresh/unknown rows, and does not block solely on stale rows.

**Acceptance Scenarios**:

1. **Given** a latest running realtime row saved within the ten-day freshness policy, **when** promotion evaluates it, **then** the gate reports it as a blocking realtime game and exits with the existing live-game block code.
2. **Given** a latest running realtime row saved more than ten days ago, **when** promotion evaluates it, **then** the gate reports it as stale and does not block solely because of that row.
3. **Given** a latest running realtime row whose save timestamp is missing, malformed, or in the future, **when** promotion evaluates it, **then** the gate fails closed and treats it as unknown/blocking.

---

### User Story 2 - Preserve existing safety classifications (Priority: P2)

As a release operator, I want turn-based, ended, and explicitly approved ignored records to retain their existing classifications so that the stale-record fix does not weaken unrelated promotion safeguards.

**Why this priority**: The gate must reduce false blockers without changing the protection for live or ambiguous games.

**Independent Test**: Run the existing mixed fixture and verify turn-based, ended, and ignored counts remain unchanged while serialized game content stays absent from output.

**Acceptance Scenarios**:

1. **Given** a mixed latest-save fixture, **when** the gate runs, **then** turn-based and ended rows remain non-blocking, explicit ignored IDs remain ignored, and only fresh or unknown realtime rows block.

---

### Edge Cases

<!--
  ACTION REQUIRED: The content in this section represents placeholders.
  Fill them out with the right edge cases.
-->

- A timestamp exactly ten days old remains blocking; only strictly older records are stale.
- A future timestamp is unknown and remains blocking rather than being treated as fresh or stale.
- A malformed serialized game, malformed options, or invalid status remains fail-closed with no serialized payload in output.
- A whitespace-padded `running` status continues to normalize to `running` before classification.
- A realtime row listed in the explicit ignored-ID input remains ignored, regardless of age, preserving the existing operator-controlled escape hatch.

## Requirements *(mandatory)*

<!--
  ACTION REQUIRED:
  1) Keep requirement types separated (Functional / Non-Functional / Constraints)
  2) Use unique IDs per type (FR-###, NFR-###, C-###)
  3) Keep Status populated for every row
  4) Non-functional requirements must include measurable thresholds
-->

### Functional Requirements

| ID | Title | User Story | Priority | Status |
|----|-------|------------|----------|--------|
| FR-001 | Classify by freshness | As a release operator, I want latest running realtime records classified by save age so that stale records are not presented as active. | High | Approved |
| FR-002 | Preserve fail-closed blocking | As a release operator, I want fresh, unknown, malformed, or future-dated realtime records to block promotion so that missing liveness evidence cannot silently authorize a release. | High | Approved |
| FR-003 | Preserve existing modes | As a release operator, I want turn-based, ended, and explicitly ignored rows to retain their current behavior so that the change remains narrow. | High | Approved |
| FR-004 | Report safe counts | As a release operator, I want counts for fresh realtime, stale, unknown, turn-based, ended, and ignored rows without serialized game payloads so that the result is actionable and privacy-safe. | Medium | Approved |
| FR-005 | Keep policy explicit | As a release operator, I want the ten-day stale threshold to be explicit and validated before remote execution so that the gate cannot receive an ambiguous policy value. | Medium | Approved |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | Read-only evaluation | The gate performs zero writes to the production database and uses the existing single latest-save read path. | Reliability | High | Approved |
| NFR-002 | Output privacy | Focused tests must prove that player names, cards, hands, and serialized game JSON do not appear in gate output for all handled error and block paths. | Security | High | Approved |
| NFR-003 | Deterministic validation | Invalid threshold input must fail before any remote command is executed, and the focused guard suite must pass with zero failures. | Reliability | High | Approved |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | No database cleanup | The mission must not delete, update, purge, or migrate production game records. | Technical | High | Approved |
| C-002 | No live bypass | The mission changes the gate classification only; it does not authorize deploy, restart, symlink switch, push, merge, or live execution. | Operational | High | Approved |
| C-003 | Narrow fileset | Code changes are limited to the promotion/release wrappers and focused release-guard tests, plus this mission's artifacts. | Technical | High | Approved |
| C-004 | Main via PR | Completed code must remain on the task-owned branch and be delivered to `main` only through the repository PR workflow. | Governance | High | Approved |

### Key Entities

- **Latest game record**: The newest persisted state for one game, including normalized status, phase, mode, and save timestamp.
- **Realtime freshness classification**: One of `fresh`, `stale`, `unknown`, or `ignored`, derived without exposing the serialized game state.

## Success Criteria *(mandatory)*

<!--
  ACTION REQUIRED: Define measurable success criteria.
  These must be technology-agnostic and measurable.
-->

### Measurable Outcomes

- **SC-001**: A fixture with one fresh, one stale, and one unknown realtime record produces the three distinct counts and blocks because fresh/unknown evidence remains.
- **SC-002**: A fixture containing only stale realtime records exits successfully without requiring an ignored-ID list.
- **SC-003**: Existing turn-based, ended, and ignored regression cases continue to pass with zero focused-test failures.
- **SC-004**: No gate stdout/stderr from any focused scenario contains serialized game JSON or private player/card fields.

## Assumptions

- Ten days is the approved stale boundary because it matches the established abandoned-game cleanup default used by the project; the boundary is strict and stale classification is not a database deletion.
- A save timestamp is the only current liveness signal available to the promotion script. Missing or invalid timestamps therefore remain blocking rather than being guessed as stale.
