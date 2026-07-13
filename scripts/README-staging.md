# TM Staging Release Flow

Use staging first, then promote the exact tested artifact to prod.

GitHub Actions in `.github/workflows/main.yml` are CI-only. They do not deploy `tm.knightbyte.win`; the scripts in this directory are the release path.

## URLs

- Staging: `https://staging.tm.knightbyte.win/`
- Preview: `https://preview.tm.knightbyte.win/`
- Prod: `https://tm.knightbyte.win/`

## Services on VPS

- Staging app: `tm-server-staging`
- Preview app: `tm-server-preview`
- Prod app: `tm-server`

TM Telegram secrets are not source-managed. Keep `TM_BOT_TOKEN` in
`~/.config/tm-server.env` on the VPS; prod `tm-server` loads it via
`EnvironmentFile`. Staging also loads the shared env file, but its unit must
set `TM_DISABLE_TELEGRAM=1` so test/E2E games never send real turn notices.

## Safe default source

The recommended release source is the sibling clean checkout:

- `C:\Users\Ruslan\tm\terraforming-mars-release-main`

Do not deploy from the main working tree unless you explicitly intend to release that exact build.

## Service Sync

Sync versioned VPS service units before rollout:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\sync_tm_services.ps1 `
  -VpsHost hostkey-codex
```

This covers:

- TM runtime units from this repo (`tm-server`, `tm-server-staging`, `tm-elo`)
- TM public nginx sites plus the shared `stream.conf` SNI gateway for `tm.knightbyte.win` and `staging.tm.knightbyte.win`
- Preview can be synced too when you explicitly pass `-EnablePreview`
- TM watcher units from sibling `tm-tierlist`

Ordinary application rollout does not synchronize service units. Pass
`-SyncServices` to `rollout_tm_server.ps1` only when the versioned units or
nginx configuration are intentionally part of the release. Watcher restarts
still require `-RestartWatchersDuringServiceSync`.

## Hard Rules

- `prod` is promote-only. Do not deploy directly to `prod`; use staging first and then promote the tested artifact.
- Runtime scripts target `hostkey-codex` by default. Pass the old `vps` alias explicitly only for a verified fallback service that has not migrated.
- Treat releases as a single release train. Collect finished commits into one clean release checkout, deploy that exact checkout to staging once, verify it, then promote the exact staging artifact to prod.
- Do not run parallel TM staging deploys or prod promotes from multiple Codex sessions. The scripts take a VPS-wide `/home/openclaw/tm-runtime/.deploy.lock` and fail fast if another TM deploy/promote is already running.
- If another Codex session has new commits, stop and merge/rebase them into the train before the staging deploy; do not keep replacing staging with partial slices.
- Release source must be a clean git checkout. If `git status --short` is not empty, fix that before deploy.
- The main working tree `C:\Users\Ruslan\tm\terraforming-mars` is for day-to-day development, not the default release source.
- Do not hot-patch `build/*.js` or `assets/*` on the VPS. Emergency fixes must be carried back into source and re-released through staging.
- Do not hot-patch source-managed `elo/*` files on the VPS. Only `elo-data.json`, `data.json`, logs, and similar generated outputs should remain mutable there.
- Trust `release.json`, not folder mtimes or guesses. Staging and prod should always be able to prove they serve the same artifact hash.
- VPS runtime should be immutable-by-default: release code lives under `/home/openclaw/tm-runtime/<env>/releases/*`, services run from `/home/openclaw/tm-runtime/<env>/current`, and mutable data lives under `/home/openclaw/tm-runtime/<env>/shared`.

## Branch Naming

- `main`: your fork's integration branch on `origin`. Only release commits that are intended to live there.
- `work/<topic>`: normal feature or bugfix branches in the main working tree.
- `sync/upstream/main`: the single long-lived candidate branch in the clean
  release checkout for merging `upstream/main` into your fork. If an older
  `sync/upstream/*` candidate already exists locally or remotely, the sync tool
  reuses that one additively; multiple candidates block the run.
- `hotfix/<topic>`: urgent fix branch cut from the currently released `origin/main`, still released through staging first.

Keep release mechanics simple: release a commit, not a snowflake environment.

## Upstream Sync Order

1. Go to the clean checkout `C:\Users\Ruslan\tm\terraforming-mars-release-main`.
2. Run `scripts\sync_tm_upstream.ps1`. It locks the checkout, fetches explicit
   `origin/main` and `upstream/main`, and is quiet when upstream is already
   contained. On the first run it safely unshallows the dedicated checkout from
   explicit `origin/main`; `-NoFetch` refuses shallow history.
3. Resolve only understood conflicts in the candidate. Gameplay, persistence,
   serialization, and database ambiguity are blocking; never choose an entire
   file with `ours` or `theirs` as a blanket policy.
4. Run the recorded validation gate and review the JSON/Markdown report under
   `C:\Users\Ruslan\tm\.tmp\upstream-sync`.
5. Push/open or update the single custom-repo PR only after the candidate is
   clean and refs are revalidated. Do not mutate an official upstream PR.
6. Review and merge the custom PR manually. `origin/main` is canonical only
   after that merge.
7. Deploy that exact canonical commit to staging and verify `release.json`.
8. Promote only the pinned staging Git/artifact pair after a separate explicit
   production decision. Realtime active games block promotion.

Contribution intent lives in `scripts/upstream-sync/adoptions.json`. An
`adopt_upstream` entry becomes actionable only after its official PR is merged
and that merge is present in the fetched `upstream/main`; overlapping semantics
still require review. Automatic resolution is limited to the ledger's exact
scope, requires exhaustive commit-touch evidence, restores the recorded
upstream tree byte-for-byte, and creates a separate audit commit.

Manual candidate preparation without a remote mutation:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\sync_tm_upstream.ps1
```

After resolving and staging an understood conflict, resume the immutable saved
validation plan with `-Mode Continue`. `-PushCandidate` is a separate opt-in and
pushes only the exact SHA that passed validation, using a normal non-force push.

The weekly Codex task runs Mondays at 10:00 Moscow time and starts paused. It
may prepare and validate a candidate, but it never merges or deploys. Activate
it only after the bootstrap candidate has been merged and one manual sync cycle
has completed successfully.

## Commands

One-command staging rollout from the clean release checkout:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\rollout_tm_server.ps1
```

This stops after staging by default. Production needs the explicit
`-PromoteProd` switch and remains subject to the pinned-artifact and live-game
gates. Service sync similarly needs `-SyncServices`.

Recommended multi-session flow:

1. Finish each development slice on its own reviewed branch.
2. Merge approved slices into `origin/main`; do not keep a second permanent
   custom integration branch.
3. In one release task, refresh/build the clean checkout and verify the exact
   `origin/main` commit.
4. Deploy once to staging and run the combined smoke/screenshots.
5. Promote with `release_tm_prod.ps1`, which pins staging's `gitSha` and
   `artifactSha256`, refuses drift, and fails closed when realtime games exist.

Refresh the clean release checkout before a real rollout:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\refresh_tm_release_checkout.ps1
```

Deploy to staging from the safe default source:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\deploy_tm_staging.ps1
```

Deploy an isolated preview instance from any clean upstream/fork checkout:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\deploy_tm_preview.ps1 `
  -SourceRoot C:\Users\Ruslan\tm\terraforming-mars-upstream-fix
```

Emergency override if you intentionally need to release a dirty source checkout or the primary working tree:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\deploy_tm_staging.ps1 `
  -SourceRoot C:\Users\Ruslan\tm\terraforming-mars `
  -AllowPrimaryWorkingTree `
  -AllowDirtySource
```

Dry run:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\deploy_tm_staging.ps1 -DryRun
```

Deploy to staging and skip smoke if you only need the rollout:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\deploy_tm_staging.ps1 -SkipSmoke
```

Deploy to staging from a different source root:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\deploy_tm_staging.ps1 `
  -SourceRoot C:\Users\Ruslan\tm\some-other-clean-checkout
```

Promote the already tested staging artifact to prod, pinned to the intended
release-checkout commit:

```powershell
$intendedGitSha = git -C C:\Users\Ruslan\tm\terraforming-mars-release-main rev-parse HEAD
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\release_tm_prod.ps1 `
  -ExpectedGitSha $intendedGitSha
```

The production gate reads every latest running save directly from the live
SQLite database in read-only/query-only mode and repeats the check immediately
before switching public traffic. Realtime games block promotion. If Ruslan has
separately confirmed a listed game is abandoned, pass its safe id explicitly as
`-IgnoredRealtimeGameId <game-id>`; this exception is never inferred or stored
automatically. Promotion requires the existing
`/home/openclaw/tm-runtime/prod/shared/db/game.db`; it never bootstraps or
migrates a production database.

Rollback an environment to the previous immutable release:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\rollback_tm_runtime.ps1 -Environment staging -DryRun
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\rollback_tm_runtime.ps1 -Environment staging
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\rollback_tm_runtime.ps1 -Environment prod -DryRun
```

Rollback to a specific release name:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\rollback_tm_runtime.ps1 `
  -Environment staging `
  -TargetRelease 20260414120447-2634ec27d148e11e0b76590c9f714f000828e7d8
```

Preview runtime retention cleanup:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\prune_tm_runtime.ps1 -DryRun
```

Apply runtime retention cleanup:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\prune_tm_runtime.ps1
```

Capture mutable TM runtime state to local `D:\tm-vps-archive`:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\backup_tm_runtime_shared.ps1
```

Preview the backup plan or include dependency cache too:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\backup_tm_runtime_shared.ps1 -DryRun
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\backup_tm_runtime_shared.ps1 -IncludeDeps
```

Run backup maintenance end-to-end and prune old local backup sets:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\run_tm_backup_maintenance.ps1
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\run_tm_backup_maintenance.ps1 -DryRun
```

Prune local TM backup roots under `D:\tm-vps-archive`:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\prune_tm_backup_archives.ps1 -DryRun
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\prune_tm_backup_archives.ps1
```

Register or update the daily Windows backup task:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\register_tm_backup_task.ps1
```

Preview or run a shared-state restore from a local backup set:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\restore_tm_runtime_shared.ps1 `
  -Environment staging `
  -BackupRoot D:\tm-vps-archive\20260414_153915 `
  -DryRun
```

Prod restore stays blocked unless you explicitly opt in:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\restore_tm_runtime_shared.ps1 `
  -Environment prod `
  -BackupRoot D:\tm-vps-archive\20260414_153915 `
  -AllowProdRestore
```

Run the full automated release gate:

```powershell
$intendedGitSha = git -C C:\Users\Ruslan\tm\terraforming-mars-release-main rev-parse HEAD
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\release_tm_prod.ps1 `
  -ExpectedGitSha $intendedGitSha
```

Run smoke manually:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\smoke_tm_staging.ps1
```

Include the cancel-action state-diff smoke in the staging smoke:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\smoke_tm_staging.ps1 -IncludeCancelAction
```

Run the cancel-action state-diff smoke manually:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\smoke_tm_cancel_action.ps1
```

Run generic verification manually:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\verify_tm_server.ps1 -Environment staging -RequireReleaseManifest -CreateGame
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\verify_tm_server.ps1 -Environment prod -RequireReleaseManifest
```

`verify_tm_server.ps1 -CreateGame` is blocked against prod by default. Use
`-AllowProdCreateGame` only when intentionally creating a disposable prod game.

## Notes

- Staging has its own workdir and DB on VPS.
- Prod and staging are split by host on `443` via SNI.
- The `STAGING` badge is host-gated and appears only on `staging.tm.knightbyte.win`.
- `release_tm_prod.ps1` replaces the old manual "check staging, then promote, then open prod" step with scripted gates.
- `release.json` is generated during deploy and is used to prove that staging and prod serve the same artifact hash after promote.
- Rollout syncs `build/`, `assets/`, and the source-managed subset of `elo/` (`index.html`, `elo-api.js`, aliases, and maintenance scripts). It deliberately preserves live Elo data files on the VPS.
- Rollout also carries `package.json` and `package-lock.json`; runtime dependencies are resolved into a managed cache under `/home/openclaw/tm-runtime/<env>/shared/deps/<package-lock-sha256>` instead of linking back to legacy checkout `node_modules`.
- Once both environments are on `tm-runtime/*/current` with managed dependency cache, old `/home/openclaw/terraforming-mars*` checkouts can be archived with `scripts/archive_tm_legacy_checkouts.ps1` as cold backups.
- `rollback_tm_runtime.ps1` switches `current` to a previous or explicit release, restarts only the environment-specific services, and verifies the served `release.json` after the swap.
- `prune_tm_runtime.ps1` keeps `current`, `previous`, and the newest release window, then removes unreferenced dependency caches plus older checkout-artifact snapshots.
- `backup_tm_runtime_shared.ps1` captures mutable runtime state (`db`, `elo`, `logs`, plus release metadata) from VPS to `D:\tm-vps-archive` by default; dependency cache stays excluded unless you explicitly pass `-IncludeDeps`.
- `restore_tm_runtime_shared.ps1` restores mutable runtime state from a local backup set, keeps a pre-restore snapshot on VPS under `tm-runtime/<env>/restore-backups`, blocks `prod` by default, and refuses release-mismatched restores unless you explicitly override it.
- `run_tm_backup_maintenance.ps1` is the daily wrapper: capture a new local backup, then prune older local backup roots.
- `prune_tm_backup_archives.ps1` only targets TM runtime backup roots under `D:\tm-vps-archive` that match the timestamped backup layout and leaves unrelated archives alone.
- `register_tm_backup_task.ps1` creates or updates a daily Windows Scheduled Task for the backup wrapper using the current user session.
- Rollout now bootstraps and uses immutable runtime roots:
  - `prod`: `/home/openclaw/tm-runtime/prod`
  - `staging`: `/home/openclaw/tm-runtime/staging`
- `deploy_tm_server.ps1 -Environment prod` is intentionally blocked by default. Use `release_tm_prod.ps1` or `promote_tm_staging_to_prod.ps1`.
- If prod is already dirty and you need to stabilize it without an immediate restart, follow [README-live-cleanup.md](README-live-cleanup.md).
