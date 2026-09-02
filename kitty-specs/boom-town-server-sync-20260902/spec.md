# Mission Specification: Boom Town Server Sync

**Branch**: `codex/boom-town-server`  
**Created**: 2026-09-02  
**Status**: Approved for implementation  
**Bead**: `tm-ai-ya5`

## Input and Baseline

Ruslan approved the proposed 54/D card rollout and full official-upstream sync with `делай`.

- Custom base: `origin/main` at `524f8cfe5c3acc709308b9a70ec21b064bb9ea81`.
- Official source: `upstream/main` pinned at `81ca5a991546d7895ca76758127f34a673d9d165`.
- Previous sync point: `7dfdbb353d362f38e6f77e50096c7463e431404c`; 36 official commits follow it.
- Boom Town is promo Prelude X80: Building and City tags; place a city on a steel/titanium bonus space; gain +2 titanium production; titanium is worth 1 M€ less.

## Requirements

| ID | Requirement |
|----|-------------|
| FR-001 | Delivered custom `main` SHALL contain official SHA `81ca5a991546d7895ca76758127f34a673d9d165` as an ancestor. |
| FR-002 | Merge conflict resolution SHALL preserve intentional custom-server behavior. |
| FR-003 | Boom Town SHALL follow the official card text and normal city-placement restrictions. |
| FR-004 | Double Down SHALL copy Boom Town's direct play effects without applying the persistent titanium-value penalty a second time. |
| NFR-001 | Focused tests, build/type/lint gates proportionate to the sync, and `git diff --check` SHALL pass. |
| C-001 | Dirty primary checkout and unrelated worktrees SHALL remain untouched. |
| C-002 | No production deployment, restart, or database mutation is authorized. |

## Acceptance Criteria

1. The pinned upstream SHA is an ancestor of the task branch and merged `origin/main`.
2. Boom Town focused tests cover its base effect, placement, and Double Down regression.
3. Required local and CI gates pass and the task-owned PR is merged.
4. Staging runs the exact clean merged `origin/main` and passes release, API, and browser smoke.
5. Production remains unchanged.

## Non-goals

- No unrelated gameplay or architecture refactor.
- No official upstream PR or public maintainer comment.
- No production deployment.
