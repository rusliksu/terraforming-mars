# Mission Specification: Sync Official Upstream 2026-08-22

**Branch**: `codex/tm-sync-upstream-20260822`  
**Created**: 2026-08-22  
**Status**: Approved for implementation and release  
**Bead**: `tm-ai-2o5`

## Input and Baseline

Ruslan requested that the custom server pull the changes visible on the official Terraforming Mars deployment and then approved the proposed PR, staging, and live sequence with `делай`.

- Custom base: `origin/main` at `c0a9a838e43a27aba159d376ab8266fbca184fb0`.
- Official source: `terraforming-mars/terraforming-mars` `main` at `7dfdbb353d362f38e6f77e50096c7463e431404c`.
- The histories have diverged: 69 upstream-only commits and 603 custom-only commits since their merge base.
- The upstream delta touches 459 files and includes gameplay, log UI, dependency-security, timer, translation, and test changes.

## Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | The delivered custom `main` SHALL contain official SHA `7dfdbb353d362f38e6f77e50096c7463e431404c` as an ancestor. |
| FR-002 | Merge conflicts SHALL preserve intentional custom-server behavior unless the official change is a compatible bug/security fix. |
| FR-003 | Existing custom features used by live SHALL not be silently removed during conflict resolution. |
| FR-004 | Dependency lockfile and source changes SHALL be integrated as one reviewable upstream-sync PR. |
| FR-005 | Staging SHALL run the exact clean `origin/main` result after PR merge. |
| FR-006 | Live SHALL receive only the exact artifact verified on staging. |
| NFR-001 | Build, lint/type checks, relevant tests, and `git diff --check` SHALL pass before PR delivery. |
| NFR-002 | Staging SHALL pass HTTP/API and browser smoke with no new console errors. |
| C-001 | Dirty/detached primary checkout and unrelated worktrees SHALL remain untouched. |
| C-002 | No production database mutation is authorized. |
| C-003 | Live promotion SHALL stop if any realtime game is active or if release state/lock/health is ambiguous. |

## Acceptance Criteria

1. `git merge-base --is-ancestor 7dfdbb353d362f38e6f77e50096c7463e431404c HEAD` succeeds on the task branch and merged `origin/main`.
2. Every merge conflict has an explicit resolution grounded in both upstream intent and custom behavior.
3. Required local and CI checks pass.
4. The task-owned PR is merged into `rusliksu/terraforming-mars:main`.
5. Staging serves the merged SHA and passes release, API, and Playwright smoke.
6. The pre-live gate proves no active realtime games and a healthy, unchanged staging artifact.
7. Prod serves the same artifact hash as staging after promotion and passes post-deploy health checks.

## Non-goals

- No cleanup of unrelated worktrees or dirty primary files.
- No redesign of custom features beyond conflict-compatible adaptations required by upstream.
- No public comments or changes to the separate official Electro Catapult PR #8395.
