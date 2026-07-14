# Upstream sync and custom release train

## Problem

The custom server has accumulated changes on several long-lived and deploy-only
branches while official upstream continues to move. Pulling upstream directly
into a live checkout makes conflict resolution, duplicate detection, review, and
rollback inseparable. It also allows a deploy wrapper to progress from source
refresh to production without an explicit production decision.

## Goals

- Make `origin/main` the only integration and release source for custom-server
  code.
- Prepare upstream updates in one machine-owned clean checkout and one candidate
  PR at a time.
- Resolve only mechanically or semantically understood conflicts; report and
  stop on gameplay, persistence, serialization, or database ambiguity.
- Treat already-contributed custom work explicitly when its official PR reaches
  upstream.
- Deploy a manually merged candidate to staging automatically, while keeping
  production promotion explicit and pinned to the exact tested artifact.
- Preserve immutable releases, fail-closed live-game protection, and exact
  rollback evidence.

## Non-goals

- No direct edits, merges, or deploys from the dirty day-to-day checkout.
- No force-push, automatic PR merge, official-upstream mutation, or maintainer
  comments.
- No automatic whole-file `ours`/`theirs` conflict policy.
- No database, secret, certificate, DNS, or service-unit migration.
- No production deploy from the weekly automation.

## Current reconciliation decision

Snapshot taken on 2026-07-13:

- Official `upstream/main`: `7b635f8c0ca7e8d364e8e8777a70dc1dfcceb0dd`.
- Custom `origin/main`: `73368348106114067bbf163b311be5838c9619b4`;
  it already contains that upstream tip.
- Custom integration tail: `origin/work/custom-server-main-20260512` at
  `bf0327da9858dbe49558e25c961c8910e9e46df5`.
- `046e1cf9` and deploy-only `1909a502` are stable-patch duplicates.
- PR #71 supersedes the earlier color-profile chain, but the later deployed
  commit `5d486ef4` is an intentional post-merge overlay: Tagir exposes only
  Rigatone Custom Two. Preserve that narrow overlay without replaying its older
  parent chain.
- `6f332865` (legacy live-game timestamps) is the only unique staging behavior
  missing from the integration tail and applies cleanly.
- HOSTKEY-only commits `281accff` and `3085daa9` are not patch-identical, but
  their missing-token and stale-reminder behavior is already present on the
  remote integration history through newer commits; they are obsolete and are
  not imported.

Therefore the bootstrap candidate is the integration tail plus the narrow
`5d486ef4` live-intent overlay and `6f332865`, with local backup refs for the
pre-canonical origin, work, prod, and staging heads. It is reviewed and merged
into `origin/main` before automation is activated.

During final validation, `origin/main` advanced to
`c1b8c6fd04a0b15b66e08e440a8cb0d819106c96` with the audited hidden-information
undo work. The candidate fetched and merged that exact head as merge commit
`28fe7b851bffe273c64b0db6cc8c4821b5e443d7` without conflicts. Its 15 changed
source/test files do not overlap the new sync or release scripts, and the full
lint, build, test-build, and test gates passed again after the merge.

## Target architecture

```text
official upstream/main
          |
          v
clean release checkout -- sync candidate PR --> custom origin/main
                                                   |
                                      manual review + merge
                                                   |
                                                   v
                                           immutable staging
                                                   |
                                        smoke + exact manifest pins
                                                   |
                                      explicit production approval
                                                   |
                                                   v
                                           immutable production
```

### Source contract

- Checkout: sibling `terraforming-mars-release-main` only.
- Base: explicit `origin/main`; never `origin/HEAD` or the checkout's current
  branch.
- Incoming source: explicit `upstream/main`.
- A shallow release checkout is unshallowed once from the explicit
  `origin/main` ref before adoption proof; shallow boundary commits are never
  guessed away.
- Candidate: one stable `sync/upstream/main` branch and one custom-repo PR.
  A pre-existing local or remote `sync/upstream/*` branch is reused across
  dates; multiple candidates fail closed. Existing reviewed history is updated
  additively and is never rebased or force-pushed.
- A process-exclusive local lock prevents overlapping sync runs.
- The checkout must be clean before and after every phase.

### Conflict contract

- Exact duplicates are evidence from stable patch IDs, not commit subjects.
- Adoption-ledger entries record immutable intent for custom work contributed
  upstream.
- An upstream adoption is active only after the official PR is merged and its
  merge commit is an ancestor of the fetched `upstream/main`.
- Automatic adoption restores only the ledger's exact path scope, and only when
  the listed custom commits are the complete canonical non-merge touch set for
  that scope. The result must be byte-equal to the recorded upstream tree and is
  recorded in a separate additive audit commit. Structured trailers bind that
  audit to the decision id, upstream SHA, and deterministic scope hash, so it is
  a durable baseline for later upstream changes to the same files; any ordinary
  post-audit custom touch blocks the next automatic adoption.
- Mechanical conflicts may be resolved in the candidate, recorded in the run
  report, and validated.
- Semantic ambiguity stops with `semantic_conflict`; no candidate push or deploy
  occurs.

### Report contract

Every run writes sanitized JSON and Markdown under workspace-local
`.tmp/upstream-sync`, outside the repository. `UpstreamSyncReportV1` includes:

- immutable base/upstream snapshots;
- candidate branch and optional custom PR identity;
- duplicate and adoption evidence;
- conflict paths and documented outcomes;
- checks, durations, exit codes, and log paths;
- final dirty paths and a machine-readable status.

No-op is quiet. Lock contention, stale refs, conflicts, and validation failures
are distinct statuses and never proceed to push or deployment.

### Release contract

- Staging and production operations default to `hostkey-codex`; the old `vps`
  remains an explicit fallback argument.
- Ordinary rollout is app-only and stops after staging. Service synchronization
  and production promotion require explicit switches.
- Staging records a pre/post snapshot and is a no-op when the exact clean Git SHA
  is already served, unless force-redeploy is explicit. The no-op decision is
  made while holding the same remote lock as a real deploy.
- Rollout carries the intended release-checkout SHA through staging verification
  and production promotion; observing a different staging SHA is drift, not a
  new artifact to adopt implicitly.
- Production promotion requires exact staging `gitSha` and `artifactSha256`
  pins, then revalidates them while holding the shared remote deploy lock.
- The production gate reads the latest state of every running game directly
  from the live SQLite database in read-only mode; it does not trust the public
  live-games route because that route intentionally filters some games.
  Promotion is permitted only when every running game is explicitly turn-based.
  Missing or malformed state fails closed; legacy Telegram games are treated as
  turn-based, while other legacy games are treated as realtime. A confirmed
  abandoned realtime game may be ignored only through an explicit, validated
  game-id argument. The gate is repeated immediately before the public switch.
- Promotion also fails closed if nginx initially points at a non-primary backend;
  the gate must never inspect one process while public traffic uses another.
- The preflight production/staging targets and manifests are compare-and-swapped
  under the shared deploy lock. Concurrent drift stops promotion instead of
  silently adopting a different baseline.
- Public switching is transactional: the exact nginx snippet and symlink
  targets are backed up, and every failed switch, config test, or reload restores
  the prior public state before returning failure.
- An exact production Git/artifact match is a no-op. Otherwise the existing
  immutable-release switch and exact rollback path remain authoritative.

## Automation contract

- Cadence: Monday 10:00 Europe/Moscow, plus a manual urgent run.
- Codex automation id: `tm-weekly-upstream-sync-candidate`.
- The automation is paused. Activation requires a merged canonical main, a
  clean release checkout, passing fixture tests, and one successful manual
  candidate cycle.
- It may prepare and validate one custom-repo candidate PR. It cannot merge,
  deploy, mutate official upstream, or touch the primary working tree.
- After a human merges the PR, a separate/manual release task may deploy that
  exact `origin/main` commit to staging. Production always requires a new,
  explicit command.

## Validation

Sync fixtures use temporary local Git repositories and cover:

- upstream already contained (no-op);
- clean two-parent merge;
- stable-patch duplicate evidence;
- a real same-line conflict;
- lock contention;
- stale base/upstream snapshots.

Candidate validation mirrors CI: install, static generation, lint, application
build, test build, and the full test suite. PowerShell fixture tests also run in
Windows CI.

## Phases

- [x] Inventory Git topology, live manifests, open custom PRs, and HOSTKEY
  ownership without touching the dirty primary checkout.
- [x] Create the independent clean release checkout and local backup refs.
- [x] Build the one-time reconciliation candidate from the integration tail,
  the intentional post-PR color overlay, and the unique legacy-timestamp fix.
- [x] Add the sync engine, adoption ledger, reports, and temporary-Git tests.
- [x] Harden staging and production guards while preserving immutable releases.
- [x] Add CI and operator documentation.
- [x] Run fixture, syntax, targeted, and full candidate validation.
- [x] Prepare the final diff and custom PR draft; wait for explicit push/PR
  approval.
- [ ] After manual merge, run a separately approved staging release and validate
  its manifest.
- [ ] Activate the paused weekly automation only after the bootstrap cycle.

## Rollback and stop conditions

- Before canonical merge, discard the local candidate and use the named backup
  refs; no remote state changes.
- After canonical merge but before deploy, revert through a normal reviewed PR.
- Staging/prod continue to use immutable release directories and their recorded
  previous symlink target.
- Stop on dirty source, changed refs after validation, deploy-lock contention,
  unhealthy service, malformed manifests, realtime games, DB/credential action,
  or any production action lacking explicit approval.
