# Safe production promotion

## Problem

The current production promotion starts `tm-server-next` against the shared live
SQLite database before the public cutover. Server startup runs maintenance and
surrendered-bot reconciliation, so the health probe can mutate production data
before rollback protection begins. The live-game gate also treats old realtime
saves as implicitly safe, and the top-level wrapper does not require the exact
staging artifact hash approved by the operator.

## Approved outcome

- Only explicitly listed realtime game IDs may bypass the promotion gate; age is
  diagnostic information, not authorization.
- Both the full Git SHA and the exact artifact SHA-256 are mandatory inputs.
- The candidate validates every latest production save by deserializing and
  serializing it from a read-only SQLite rehearsal copy.
- No candidate server process touches the live database while the old server is
  running.
- Cutover is single-writer: stop the old server, re-run the game gate, create a
  consistent SQLite backup, verify integrity and a restore copy, switch the
  release, then start the new server.
- A failed startup restores both the previous release symlink and the verified
  database backup before the old server restarts.

## Non-goals

- No gameplay behavior changes.
- No database schema migration.
- No production deployment in this implementation package.
- No automatic inference that a game is abandoned.

## Phases and gates

1. Add failing regression coverage for exact pins, explicit-only realtime
   exceptions, no second live writer, backup ordering, and DB rollback.
2. Add a read-only latest-save corpus validator with focused unit tests.
3. Replace blue/green live-DB startup with rehearsal-copy validation and a
   single-writer maintenance-window cutover.
4. Add consistent backup, `integrity_check`, restore proof, and DB-aware rollback.
5. Update operator documentation and remove the obsolete next-server promotion
   surface.
6. Run release-guard regressions, focused validator tests, lint/build, full tests,
   and a dry-run inspection. Validate the production DB only through a remote
   read-only copy/rehearsal command before any later deployment decision.

## Rollout and rollback

The public Nginx route remains on the primary port throughout. A short outage is
preferred to two concurrent writers. The rollback database is retained until the
new primary server, manifest, and ELO endpoint are healthy. Failure after the old
server stops restores the verified database copy and previous release before
restarting services.

## Decision log

- 2026-09-20: Prefer a short single-writer maintenance window over a blue/green
  probe sharing live SQLite.
- 2026-09-20: Treat stale realtime saves as blockers unless their exact IDs were
  confirmed abandoned by the operator.
- 2026-09-20: Validate the whole latest-save corpus with application
  deserialize/serialize code, not only `PRAGMA integrity_check`.
- 2026-09-20: Keep the operator-supplied artifact pin distinct from the staging
  manifest value; PowerShell variable names are case-insensitive, so the two
  values must not share a name that differs only by case.

## Verification status

- Release-guard regression suite: passed.
- PowerShell parser and embedded Bash syntax: passed.
- Exact Git/artifact pin dry-run: passed.
- Focused save-corpus validator tests: 2 passed.
- Server lint: passed.
- Production build: passed with the existing Webpack size warnings.
- Full test suite: 7,782 server tests passed, 3 pending; 619 client tests passed.
- Production deployment: intentionally not run in this implementation package.
