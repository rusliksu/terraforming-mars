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
`~/.config/tm-server.env` on the VPS; both `tm-server` and `tm-server-staging`
load that file via `EnvironmentFile`.

## Safe default source

The recommended release source is the sibling clean checkout:

- `C:\Users\Ruslan\tm\terraforming-mars-release-main`

Do not deploy from the main working tree unless you explicitly intend to release that exact build.

## Service Sync

Sync versioned VPS service units before rollout:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\sync_tm_services.ps1
```

This covers:

- TM runtime units from this repo (`tm-server`, `tm-server-staging`, `tm-elo`)
- TM public nginx sites plus the shared `stream.conf` SNI gateway for `tm.knightbyte.win` and `staging.tm.knightbyte.win`
- Preview can be synced too when you explicitly pass `-EnablePreview`
- TM watcher units from sibling `tm-tierlist`

`rollout_tm_server.ps1` runs this sync as step 1 by default. It uses safe mode
without restarting watcher services unless you explicitly pass
`-RestartWatchersDuringServiceSync`.

## Hard Rules

- `prod` is promote-only. Do not deploy directly to `prod`; use staging first and then promote the tested artifact.
- Release source must be a clean git checkout. If `git status --short` is not empty, fix that before deploy.
- The main working tree `C:\Users\Ruslan\tm\terraforming-mars` is for day-to-day development, not the default release source.
- Do not hot-patch `build/*.js` or `assets/*` on the VPS. Emergency fixes must be carried back into source and re-released through staging.
- Do not hot-patch source-managed `elo/*` files on the VPS. Only `elo-data.json`, `data.json`, logs, and similar generated outputs should remain mutable there.
- Trust `release.json`, not folder mtimes or guesses. Staging and prod should always be able to prove they serve the same artifact hash.
- VPS runtime should be immutable-by-default: release code lives under `/home/openclaw/tm-runtime/<env>/releases/*`, services run from `/home/openclaw/tm-runtime/<env>/current`, and mutable data lives under `/home/openclaw/tm-runtime/<env>/shared`.

## Branch Naming

- `main`: your fork's integration branch on `origin`. Only release commits that are intended to live there.
- `work/<topic>`: normal feature or bugfix branches in the main working tree.
- `sync/upstream-YYYYMMDD`: temporary branch in the clean release checkout for merging `upstream/main` into your fork.
- `hotfix/<topic>`: urgent fix branch cut from the currently released `origin/main`, still released through staging first.

Keep release mechanics simple: release a commit, not a snowflake environment.

## Upstream Sync Order

1. Go to the clean checkout `C:\Users\Ruslan\tm\terraforming-mars-release-main`.
2. Fetch both remotes: `git fetch origin upstream`.
3. Refresh local `main` from your fork's `origin/main`.
4. Create a temporary sync branch such as `sync/upstream-20260413`.
5. Merge `upstream/main` into that branch and resolve conflicts there, never in the live VPS checkout.
6. Run tests and build in the clean checkout.
7. Deploy that exact checkout to staging.
8. Verify staging, including `release.json`.
9. Promote the tested staging artifact to prod.
10. After prod is good, fast-forward or merge back into `origin/main`, then update other worktrees as needed.

## Commands

One-command rollout from the clean release checkout:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\rollout_tm_server.ps1
```

Refresh the clean release checkout before a real rollout:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\refresh_tm_release_checkout.ps1
```

Deploy to staging from the safe default source:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\deploy_tm_staging.ps1
```

Deploy an isolated preview instance from any clean upstream/fork checkout:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\deploy_tm_preview.ps1 `
  -SourceRoot C:\Users\Ruslan\tm\terraforming-mars-upstream-fix
```

Emergency override if you intentionally need to release a dirty source checkout or the primary working tree:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\deploy_tm_staging.ps1 `
  -SourceRoot C:\Users\Ruslan\tm\terraforming-mars `
  -AllowPrimaryWorkingTree `
  -AllowDirtySource
```

Dry run:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\deploy_tm_staging.ps1 -DryRun
```

Deploy to staging and skip smoke if you only need the rollout:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\deploy_tm_staging.ps1 -SkipSmoke
```

Deploy to staging from a different source root:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\deploy_tm_staging.ps1 `
  -SourceRoot C:\Users\Ruslan\tm\some-other-clean-checkout
```

Promote the already tested staging artifact to prod:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\promote_tm_staging_to_prod.ps1
```

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
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\release_tm_prod.ps1
```

Run smoke manually:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\smoke_tm_staging.ps1
```

Run generic verification manually:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\verify_tm_server.ps1 -Environment staging -RequireReleaseManifest -CreateGame
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\verify_tm_server.ps1 -Environment prod -RequireReleaseManifest
```

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
