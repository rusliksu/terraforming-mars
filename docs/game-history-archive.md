# Private game history archive

This is an offline archive foundation. It does not provide a Play button, change
live persistence, or reclaim database space. Raw states contain private player
data and must never be served through HTTP or copied into public assets.

## Code map

| Module | Responsibility | Dependencies |
|---|---|---|
| `src/server/archive/ArchiveFormat.ts` | JSON value types, bounded canonical encoding, hashes, source identity and coverage | Node crypto |
| `src/server/archive/ArchiveCodec.ts` | Full/delta selection and inert structural reconstruction | ArchiveFormat |
| `src/server/archive/ArchiveReader.ts` | Bounded local files, validated manifest, exact save lookup and complete verification | Format, codec, Node fs/path/zlib |
| `src/server/archive/HistorySource.ts` | Explicit offline file/SQLite selection, bounded transactions, ordered source fingerprints | Format, reader file utilities, optional better-sqlite3 |
| `src/server/archive/ArchiveWriter.ts` | Private temporary output, verified readback, source recheck and immutable publication | Source, codec, reader, Node filesystem/crypto/zlib and Windows ACL tools |
| `src/server/tools/archive-game-history.ts` | One-game offline operator CLI and code-only errors | Source, writer, Node argument parser |

No archive module imports Game, GameLoader, production database initialization, cache,
routes or network clients. The trusted reader returns private JSON values;
a future public replay projection needs a separate visibility contract.

`readSave(root, saveId)` reads the manifest and only the containing gzip group.
It verifies compressed bytes and every base/result hash traversed before the
requested save. It does not claim that unread groups are valid.
`verifyArchive(root)` reconstructs every record and checks the final ended state.
Neither function mutates source files. Missing saves fail with
`SAVE_NOT_RECORDED`; they never select the nearest available save.

Canonical state encoding sorts object keys by JavaScript string comparison,
retains array order and JSON null, and follows JSON.stringify for primitives.
Unknown fields and own keys such as `__proto__` remain data. State depth is
limited to 128; record envelopes have a separate fixed depth allowance.
This format is not RFC 8785 or a gameplay action journal.

The reader requires a trusted private local directory without links in its
path. It rejects detected links and bounded-file changes. It does not establish
filesystem power-loss durability or provide an import endpoint for hostile
remote users. Filesystem access permissions remain necessary.

## Verification

Synthetic reader fixtures are written only under
`D:/tm-db/smartbot-lab/archive-reader-tests`. They contain invented states and
are retained for inspection. No real game state belongs in source control.

The four filesystem/source/writer/CLI suites run only on Windows because their
fixtures require D: and publication exercises Windows ACLs. On other platforms
they are reported as skipped; the pure codec suite still runs. A skipped suite
does not verify Linux export or filesystem support.

```text
node node_modules/mocha/bin/mocha.js --import=tsx "tests/server/archive/*.spec.ts"
npm run make:static
npm run build:tests
npm run lint:server
npm run build
```

## Offline capture and publication

`HistorySource.scan()` reads one explicitly selected history and returns its
ordered hashes and fingerprint. `exportHistory(source, outputRoot)` validates
the source, writes groups from a second scan, verifies every state from disk,
then scans the source again before publication. Changes to stored bytes during
capture refuse publication. Formatting-only changes between separate exports
retain the same canonical JSON revision. Receipts report canonical state bytes,
compressed group bytes and manifest bytes separately.

The persisted receipt includes format/codec and recorded coverage, with action
coverage explicitly unknown. `rawSourceBytes` counts the selected history JSON
bytes captured by the original export, excluding the separate current-state
copy; `canonicalStateBytes` counts their canonical JSON encoding. On a matching
retry the original verified receipt and its byte metric are retained, even if
the source JSON now has different whitespace. The return status becomes
`ALREADY_VERIFIED`; the persisted status remains `VERIFIED`.

The operator must supply a quiescent dataset or a consistent offline copy and
declare `offline: true`. That declaration is a precondition, not proof of
inactivity. These scans do not lock out a noncooperating writer; source mutation
after the final check invalidates any later claim about the current live game.
The exporter cannot authorize retention or deletion.

The initial adapters accept Windows D: paths outside checkouts and known serving
or runtime roots. The output root must already exist and be separate from the
source. File reads cover only the selected current/history files; no session or
other-game payload is read. SQLite loads the existing optional native backend
only when selected, opens read-only/fileMustExist, enables query_only and uses
one read transaction per scan. Its input must be a standalone rollback-journal
database without WAL/SHM/hot-journal sidecars; WAL-mode headers are refused before
opening SQLite. No backend fallback, recovery or automatic conversion occurs.

Each new temporary directory gets an ACL for the current user, SYSTEM and local
Administrators before state bytes are written. A process guard and exclusive
output-root lock serialize cooperating exporters. All files are closed and
synced before same-filesystem directory rename. Existing output must match the
manifest/receipt and pass full reconstruction; it is never repaired or replaced.
An identical successful retry removes only its own freshly generated temporary
files. Failed attempts and stale locks are retained for operator inspection;
there is no recursive cleanup or automatic lock stealing.

The fault tests simulate write/rename errors and an exception after rename.
They do not establish durability after OS/power loss. Windows directory rename
and ACL behavior have been exercised locally; Linux delivery remains unverified.

Archive-before-prune integration, physical database reclamation, deployment and
public replay remain separate stages.

## Operator command

Build with `npm run make:static` and `npm run build:server` in the task checkout.
Create the private output directory on D: first. Supply an existing quiescent
local history directory or a consistent offline SQLite copy. Replace the sample
paths and synthetic game selector below with that explicitly chosen input.

```powershell
node build/src/server/tools/archive-game-history.js --offline --source files --input D:/tm-db/smartbot-lab/offline-input --game g000000000003 --output D:/tm-db/smartbot-lab/private-archives
node build/src/server/tools/archive-game-history.js --offline --source sqlite --input D:/tm-db/smartbot-lab/offline-copy.sqlite --game g000000000003 --output D:/tm-db/smartbot-lab/private-archives
node build/src/server/tools/archive-game-history.js --help
```

These are templates, not production commands. Source kinds are exactly `files`
and `sqlite`. All five options are required once; unknown options, duplicate
options, positionals and missing `--offline` fail before export. There is no
force/prune/deploy or unlimited mode. Schema/engine metadata stays `unknown`.
The selector is passed as a local process argument; protect local process access
as well as the archive. Do not paste real selectors into shared command logs.

Exit 0 writes one aggregate receipt to stdout, status `VERIFIED` or
`ALREADY_VERIFIED`. Exit 2 writes `{"status":"ERROR","code":"INVALID_ARGUMENTS"}`
to stderr for argument errors; exit 1 writes the same shape with a typed archive
failure code for export failures. Errors omit paths, SQL, game IDs and state.
`--help` alone prints static usage and exits 0. No trusted reader state is printed
by this command. The existing reader API remains the private exact-state surface.

CLI tests launch real Node subprocesses with invented filesystem and SQLite
histories under `D:/tm-db/smartbot-lab/archive-cli-tests`. They check real export,
readback, retries, unchanged source bytes, output privacy, rejected arguments,
unsafe paths and incomplete games. Source modules import no gameplay or routes.

## Fixed-corpus measurement (2026-09-05)

The compiled CLI exported two historical local lab games on Windows with Node
22.22.0. All 493 saved states matched the source JSON after disk readback;
source content fingerprints remained unchanged. Archives include every group,
manifest and receipt. The baseline independently gzips arrays of canonical full
states in the same 20-state windows at level 6, without a baseline index (a
conservative comparison). This is neither an action log nor a production sample.

| Sample | States | Archive bytes | Grouped full gzip bytes | Export seconds | Export peak RSS MiB |
|---|---:|---:|---:|---:|---:|
| 1 | 237 | 318,950 | 3,887,569 | 37.21 | 126.93 |
| 2 | 256 | 367,338 | 4,615,013 | 62.38 | 132.26 |
| Total | 493 | 686,288 | 8,502,582 | | |

The archive is **8.07% of the compressed snapshot baseline (12.39 times smaller)**,
meeting the <=25% corpus criterion. The original history JSON occupies
119,605,148 bytes and remains in place; this export initially adds storage.

Fresh-reader-process first/middle/final lookup times were 19/484/795 ms and
18/261/854 ms; immediately repeated reads were 12/443/882 ms and 13/242/837 ms.
OS caches were not evicted. Concurrent local tests/build ran during measurement;
these are observational samples, not cold-disk timings, percentiles, universal
speed claims or a heap bound. Reader peak RSS was 131-133 MiB. Per-process export
RSS comes from the OS high-water counter. This offline result does not establish
server-route latency or Linux behavior.

Local aggregate report and bounded measurement scripts are retained under
`D:/tm-db/smartbot-lab/archive-wp03-20260905`; the run report is
`run-GHOH8c/measurement.json`. Raw archives stay private on D:. The runner pins
the two original source hashes, invokes the real compiled CLI, compares every
restored value, rechecks source fingerprints and fails if count differs from 493
or the archive exceeds one quarter of the grouped full-snapshot baseline.
