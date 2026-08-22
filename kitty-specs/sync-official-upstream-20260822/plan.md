# Implementation Plan: Sync Official Upstream 2026-08-22

**Branch**: `codex/tm-sync-upstream-20260822`  
**Base / target**: `origin/main` / `main`  
**Official source**: `upstream/main` at `7dfdbb353d362f38e6f77e50096c7463e431404c`

## Strategy

Merge the pinned official SHA into the task branch instead of rebasing 603 custom commits. Resolve conflicts file-by-file, preferring compatible upstream fixes while retaining custom-only contracts. Verify ancestry and review the aggregate diff against both parents.

After local checks, deliver through one task-owned PR. Wait for required CI, merge only when clean and mergeable, refresh a clean release checkout to exact `origin/main`, deploy to staging, run API/browser smoke, check active games, and promote the immutable staging artifact to prod.

## Work Packages

### WP01 — Integrate and resolve

- Fetch exact origin/upstream refs and verify expected SHAs.
- Merge pinned upstream SHA without altering primary checkout.
- Resolve all conflicts with custom behavior inventory and compile feedback.
- Verify upstream ancestry and inspect both-parent diff.

### WP02 — Validate and deliver PR

- Install dependencies only through the repository lockfile if required.
- Run build, lint/type checks, focused custom regressions, and broad tests proportionate to the 459-file delta.
- Commit mission dossier and merge result, push, open PR, and wait for green CI.
- Merge the task-owned PR only if head, CI, and mergeability remain valid.

### WP03 — Stage and release

- Refresh a clean release checkout to exact `origin/main`.
- Capture release baselines and deploy that checkout to staging.
- Verify release manifest, HTTP/API health, and Playwright console/UI smoke.
- Prove no realtime game is active; then promote the exact staging artifact to prod.
- Verify prod manifest/hash/health and record the real outcome.

## Risk Controls

- Pin upstream SHA to avoid moving-target merge drift.
- Do not use dirty-source or primary-checkout deploy bypasses.
- Do not create prod test games or mutate production DB.
- Stop on ambiguous conflict intent, deploy lock, unhealthy service, concurrent staging drift, or active realtime play.
