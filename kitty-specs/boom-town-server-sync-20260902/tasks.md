# Work Packages: Boom Town Server Sync

## WP01 — Integrate pinned upstream

**Status**: in progress

- [x] Verify pinned refs and clean task worktree.
- [ ] Merge official SHA and resolve conflicts.
- [ ] Verify ancestry and inspect Boom Town/Double Down paths.

## WP02 — Correct and verify Boom Town

**Status**: pending  
**Depends on**: WP01

- [ ] Add the focused regression test.
- [ ] Implement the narrow fix.
- [ ] Run targeted and proportionate broad checks.

## WP03 — Deliver and stage

**Status**: pending  
**Depends on**: WP02

- [ ] Push and merge the task-owned PR after green checks.
- [ ] Deploy exact merged `origin/main` to staging.
- [ ] Verify staging and record that prod remains unchanged.
