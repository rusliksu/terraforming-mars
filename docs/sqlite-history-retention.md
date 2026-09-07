# SQLite history retention

The one-game operator command archives the exact recorded JSON history of a
completed game, verifies its private files, and commits a locator with removal
of only intermediate SQLite rows. The latest row and an existing save 0 stay
live. This does not add public replay, shrink the database file or schedule
automatic retention. PostgreSQL and filesystem retention are unchanged.

## Entry point and limits

`src/server/tools/maintain-game-history.ts` opens only the explicitly supplied
existing SQLite file. It calls `SQLiteArchiveRetention.preview/apply`, without
normal database initialization, migrations or environment-based DB discovery.
The [archive code map](game-history-archive.md#code-map) describes the underlying
reader, writer, catalog and SQLite integration.

All options are unique. Exactly one context, `--offline` or `--maintenance`, is
required, together with `--database`, `--game`, `--archives`, `--workspace` and
`--max-states`. The selected count budget must be
1 through 4096; it can only tighten the fixed limits. Default mode opens SQLite
read-only and returns a preview. Apply additionally requires `--apply`,
`--exclusive` and the exact preview `--revision`. These assertions do not prove
that another process has stopped. There is no force, fleet scan, unlimited mode,
automatic retry, lock stealing, backup, vacuum or service control.

In `--offline` context, both DB and archive directory must be inside the supplied
non-linked workspace, outside checkouts and excluded serving/runtime paths. This
keeps the original offline policy, including its rejection of `prod` paths.

The explicit `--maintenance` context admits an existing regular source database
outside the archive workspace, including a `prod/shared/db` path. Its path must be
absolute, non-linked and outside checkouts. On Linux the source must belong to
the current user and must not be writable by group or others. Windows source and
archive paths still require D:. No context infers a database from environment,
changes file permissions or proves that server writers are stopped.

In both contexts the archive remains inside its independently validated private
workspace, outside serving/runtime paths and checkouts. Linux requires ownership
and mode 0700 on that workspace. The archive directory must already exist. Do not
use a symlink, move the database or change permissions to bypass a refusal.
The file must use DELETE journal mode and synchronous FULL or stronger;
the tool never converts WAL or another backend. Library retention and hydration
set a five-second busy timeout which remains on that connection until changed or
closed. The operator connection closes after the invocation.

Fixed limits remain: one worker, one game, 4096 states, 8 MiB per state,
20 states and 64 MiB per group, 512 MiB total decoded data, and 128 MiB compressed
groups. Capacity admission requires DB file bytes + 1 GiB staging + 256 MiB
archive allowance + 2 GiB reserve. It uses the smaller available capacity on
archive and DB/journal filesystems and rechecks before major write phases.
Unrelated processes can still consume space later; write failures remain errors.

## Synthetic example

Build with `npm run build`. The following illustrates a synthetic completed game
in a previously prepared private lab workspace. It does not create a database.

```text
node build/src/server/tools/maintain-game-history.js --offline --database D:/tm-db/smartbot-lab/retention/copy.sqlite --game g000000000008 --archives D:/tm-db/smartbot-lab/retention/archives --workspace D:/tm-db/smartbot-lab/retention --max-states 4
```

Review `sourceRevision`, `count`, `prunableRows`, `rawSourceBytes`, `databaseBytes`,
`availableBytes` and `requiredFreeBytes`. The preview writes no archive, lock or
DB row. A read-only preview cannot recover a hot SQLite journal; stop and use the
recovery procedure if it refuses. A READY result is evidence for that snapshot.

After establishing exclusive access, rerun the same arguments with
`--apply --exclusive --revision <the-returned-64-character-hash>`. On Linux replace
all lab paths with paths inside the explicitly prepared private Linux workspace.
Do not use actual game IDs or private paths in public command logs.

For an existing runtime database and a separate private archive workspace, select
`--maintenance` instead of `--offline`. This example shows the layout exercised
with synthetic data by the subprocess test; use the admission gates below before
any real operational invocation:

```text
node build/src/server/tools/maintain-game-history.js --maintenance --database /srv/tm-runtime/prod/shared/db/game.db --game g000000000008 --archives /srv/tm-history-archive/archives --workspace /srv/tm-history-archive --max-states 4
```

It still defaults to read-only preview. Apply requires the same explicit revision
and exclusive assertion. Maintenance changes only source-path admission; private
archive validation, finite resource bounds and atomic retention/hydration remain.

Apply reports ARCHIVED, ALREADY_ARCHIVED or NOTHING_TO_PRUNE, the exact revision,
row counts, fixed limits and database file bytes before/after. An actual prune also
reports free pages before/after. `rawSourceBytesBefore` measures selected live JSON
before that invocation; a repeat measures the remaining live rows. Immutable
archive receipts contain compressed group and manifest byte counts. Removed rows
and free pages indicate reusable SQLite space, not reclaimed filesystem bytes;
file growth from catalog/journal work is possible. VACUUM is a separate operation.

Exit 0 means a successful aggregate report. Exit 2 means INVALID_ARGUMENTS;
exit 1 reports a sanitized archive/IO code. JSON errors omit paths, SQL, game IDs
and state. No private hand or raw archived JSON appears on stdout. A killed
process or lost response can leave an uncertain outcome: inspect the binding and
repeat the same revision under the recovery conditions below.

## One-game pilot admission

Development and synthetic tests do not authorize a live pilot. Obtain separate
approval for the selected game's data inspection, coordinated backup, exclusive
service window, deployment and source-row pruning. File reclamation, service
switching and unattended operation each retain their own approval gate.

1. Verify the deployed code SHA, actual SQLite backend/file, archive reader
   configuration and filesystem support. Do not infer them from an old report.
   Configure `TM_HISTORY_ARCHIVE_ROOT` and, on Linux, `TM_HISTORY_ARCHIVE_WORKSPACE`
   for the server before it encounters a pruned game. The same immutable archive
   root must remain accessible to that service user across releases.
2. Establish exclusive storage ownership using the actual service processes and
   open files; account for maintenance workers and other database users. No lock
   file, process name or operator flag alone proves that old writers are absent.
   Do not mix old server binaries with a database that contains archive bindings.
3. Prepare and independently verify a coordinated backup of the stopped SQLite
   database and all referenced immutable archives. Verify restoration in an
   isolated environment. A DB-only backup taken after pruning is incomplete.
4. Confirm the exact one-game selector, consistent finished metadata, original
   recorded ID coverage, chosen finite count budget, directory privacy and current
   capacity admission. Inspect the preview privately; stale or incomplete state
   requires a new review rather than changing the expected hash automatically.
5. With separate apply authority, apply that reviewed revision once. Verify latest,
   setup/clone and representative historical reads through the deployed server
   before ending the maintenance window. Record aggregate counts, byte metrics,
   binding and release identity privately. An unexpected result stops the pilot.

Archive bindings are needed for historical IDs and missing saves. Before a save
or administrative rollback, the server verifies and reconstructs the current
logical history, then restores missing rows, detaches the binding and performs
the mutation in one synchronous SQLite transaction. Live overrides win; detached
archives cannot reintroduce a canceled tail. Failed hydration leaves the binding
and current rows intact. Historical GameLoader reads suppress deserialize saves;
the rollback HTTP route waits for completion and rejects replaced resident state.
SQLite's old DELETE-only completed-history maintenance is disabled.

## Interruption and refusal recovery

Keep the exclusive window while diagnosing. Preserve the DB, journal and archives
as one unit. Never delete a journal, rewrite a locator, replace an archive or select
a new revision merely to make a failing command succeed.

| Observation | Expected state and next step |
|---|---|
| Interrupted before publication | Source rows remain; private pending files or a writer lock may remain. Inspect the exact attempt. |
| Published archive, no committed locator | Source rows remain. The archive may be unreferenced; it can be verified on a same-revision retry. |
| Process death during locator/prune transaction | SQLite rolls back locator and all partial deletes on recovery. Preserve its hot journal. |
| Process death after commit, before receipt | Locator and retained live rows already identify the archive. Verify the full logical history; same-revision apply is idempotent. |
| Process death during hydration | SQLite restores the prior binding and live rows; a later valid hydration can retry. |
| ARCHIVE_CONFLICT with `.writer.lock` | No automatic takeover. Verify the exact owner has exited and no exporter is active. Separately authorize removal of that exact stale lock; preserve pending/archive files. |
| SOURCE_CHANGED / SOURCE_NOT_COMPLETED | Keep all rows. Re-establish the source and review a fresh plan. |
| Missing/corrupt archive | Historical fallback and mutation refuse; latest remains live. Recover the matching verified archive from the coordinated backup. |
| INSUFFICIENT_SPACE / IO_FAILURE / busy DB | Stop, preserve evidence, resolve the actual cause and re-preview; do not loosen limits. |

Apply opens the explicitly authorized existing file read/write, allowing SQLite's
normal journal recovery before continuing. If recovery itself fails, stop and
restore the coordinated unit under separate approval. Do not restore only an old
DB or only a subset of archive files over a running service.

Subprocess tests also cover a runtime-shaped `prod/shared/db` source outside the
private archive workspace: offline refuses, maintenance preview preserves bytes,
and an explicit apply retains every logical state. Relative/directory/linked
sources and conflicting contexts refuse. Linux additionally exercises source
write permissions and private archive workspace permissions.

Subprocess tests forcibly kill the real operator after rename, after the first
DELETE and after commit, plus a real hydration after its first INSERT. They verify
every original JSON value, atomic rollback, lock refusal and controlled retries.
They exercise process death, not sudden power removal or hostile storage. Linux
publication syncs files and directories; Windows retains its ACL/file-sync
contract. Power-loss durability on the intended filesystem/storage stack remains
a separate pilot condition; these tests do not establish universal hardware
guarantees. No live pilot, production-data inspection or physical reclamation is
performed by the tests or this runbook.
