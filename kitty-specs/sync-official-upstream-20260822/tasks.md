# Work Packages: Sync Official Upstream 2026-08-22

## WP01 — Integrate and resolve

**Status**: completed

- [x] Verify pinned refs and clean task worktree.
- [x] Merge official SHA `7dfdbb353d362f38e6f77e50096c7463e431404c`.
- [x] Resolve conflicts without dropping custom behavior.
- [x] Verify ancestry and review the merge delta.

## WP02 — Validate and deliver PR

**Status**: completed
**Depends on**: WP01

- [x] Run dependency, build, lint/type, focused, and broad test gates.
- [x] Pass `git diff --check` and review changed files.
- [x] Commit, push, open PR, and verify CI.
- [x] Merge the validated task-owned PR.

## WP03 — Stage and release

**Status**: completed
**Depends on**: WP02

- [x] Refresh exact clean `origin/main` release checkout.
- [x] Capture baseline, deploy staging, and pass API/browser smoke.
- [x] Prove no active realtime games and no release drift.
- [x] Promote the exact staging artifact to prod.
- [x] Verify prod artifact, health, and close the mission/Bead.

## Closeout evidence

- Custom PR: `rusliksu/terraforming-mars#136`
- Merged and deployed SHA: `0d829e8ead8c692c8cba0230ccedc1f7caaf6a48`
- Production artifact: `afde802a5a794a7bd41e632e75f8a13ff0ee9fdb1f705303196e983e3e2468ff`
- Verification: CI 6/6, client 594 passing, server 7612 passing, staging/prod API smoke, and zero browser console errors
- Lifecycle: Bead `tm-ai-2o5` closed; task and release worktrees/branches cleaned up
