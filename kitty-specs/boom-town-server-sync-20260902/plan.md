# Implementation Plan: Boom Town Server Sync

## Strategy

Merge pinned official SHA `81ca5a991546d7895ca76758127f34a673d9d165` into the isolated task branch. Resolve conflicts by preserving custom contracts and accepting compatible official fixes. Add the smallest regression fix needed so Double Down does not duplicate Boom Town's persistent titanium-value modifier.

Deliver through one task-owned PR. After merge, refresh a clean release checkout to exact `origin/main`, deploy only to staging, and verify API plus browser behavior.

## Work Packages

### WP01 — Integrate pinned upstream

- Merge the pinned official SHA.
- Resolve conflicts and verify ancestry.
- Inventory Boom Town implementation and its Double Down path.

### WP02 — Correct and verify Boom Town

- Add a focused Double Down regression test.
- Implement the narrow behavior correction.
- Run focused and proportionate repository checks.

### WP03 — Deliver and stage

- Commit, push, open the task-owned PR, verify CI, and merge when clean.
- Deploy exact clean merged `origin/main` to staging.
- Run release, API, and Playwright smoke; do not touch prod.
