# Mission Specification: Harden TM Prod Promotion Gates

## Intent

When an operator promotes a tested staging artifact, the workflow must detect active realtime games even if a latest save stores harmless surrounding whitespace in its status. It must also allow a healthy candidate enough time to cold-start against the large production database. CAS, exact SHA/artifact checks, two read-only live-game gates, health checks, rollback, and fail-closed behavior remain mandatory.

## Requirements

| ID | Requirement | Status |
|---|---|---|
| FR-001 | Normalize surrounding whitespace before comparing a latest-save status with `running`. | Approved |
| FR-002 | Reject any normalized status other than exactly `running`. | Approved |
| FR-003 | Make the next-service health window configurable in whole seconds with a 180-second default. | Approved |
| FR-004 | Preserve the existing two-second polling interval and final health requirement. | Approved |
| FR-005 | Add focused behavioral regressions for whitespace-padded running status and timeout default/override validation. | Approved |
| NFR-001 | Focused release-guard tests pass with zero failures. | Approved |
| NFR-002 | Gate output continues to expose only counts and validated game IDs. | Approved |
| C-001 | Preserve CAS, exact artifact identity, lock, two gates, read-only SQLite, rollback, and fail-closed semantics. | Approved |
| C-002 | Touch only the promotion script, focused tests, and mission artifacts. | Approved |
| C-003 | No deploy, restart, database mutation, push, or merge belongs to this mission. | Approved |

## Acceptance scenarios

1. A realtime fixture with status ` running ` blocks with exit code 42.
2. A status that does not normalize to `running` fails closed without leaking serialized game data.
3. The generated remote script uses 180 seconds by default and accepts a valid explicit seconds override.
4. Invalid timeout values fail before any remote command.

## Evidence source

Separately authorized release on 2026-08-12: a fresh realtime save used whitespace-padded status, and the candidate exceeded the prior 40-second health window while becoming healthy within a runtime-only 180-second retry.
