# Work Packages: Sync Official Upstream 2026-08-22

## WP01 — Integrate and resolve

**Status**: in_progress

- [x] Verify pinned refs and clean task worktree.
- [x] Merge official SHA `7dfdbb353d362f38e6f77e50096c7463e431404c`.
- [x] Resolve conflicts without dropping custom behavior.
- [ ] Verify ancestry and review the merge delta.

## WP02 — Validate and deliver PR

**Status**: pending  
**Depends on**: WP01

- [x] Run dependency, build, lint/type, focused, and broad test gates.
- [x] Pass `git diff --check` and review changed files.
- [ ] Commit, push, open PR, and verify CI.
- [ ] Merge the validated task-owned PR.

## WP03 — Stage and release

**Status**: pending  
**Depends on**: WP02

- [ ] Refresh exact clean `origin/main` release checkout.
- [ ] Capture baseline, deploy staging, and pass API/browser smoke.
- [ ] Prove no active realtime games and no release drift.
- [ ] Promote the exact staging artifact to prod.
- [ ] Verify prod artifact, health, and close the mission/Bead.
