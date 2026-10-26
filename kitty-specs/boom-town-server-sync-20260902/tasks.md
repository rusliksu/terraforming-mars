# Work Packages: Boom Town Server Sync

## WP01 — Integrate pinned upstream

**Status**: complete

- [x] Verify pinned refs and clean task worktree.
- [x] Merge official SHA and resolve conflicts.
- [x] Verify ancestry and inspect Boom Town/Double Down paths.

## WP02 — Correct and verify Boom Town

**Status**: complete  
**Depends on**: WP01

- [x] Add the focused regression test.
- [x] Implement the narrow fix.
- [x] Run targeted and proportionate broad checks.

## WP03 — Deliver and stage

**Status**: in progress  
**Depends on**: WP02

- [ ] Push and merge the task-owned PR after green checks.
- [ ] Deploy exact merged `origin/main` to staging.
- [ ] Verify staging and record that prod remains unchanged.
