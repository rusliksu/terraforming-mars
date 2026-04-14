# TM Staging Release Flow

Use staging first, then promote the exact tested artifact to prod.

GitHub Actions in `.github/workflows/main.yml` are CI-only. They do not deploy `tm.knightbyte.win`; the scripts in this directory are the release path.

## URLs

- Staging: `https://staging.tm.knightbyte.win/`
- Prod: `https://tm.knightbyte.win/`

## Services on VPS

- Staging app: `tm-server-staging`
- Prod app: `tm-server`

## Safe default source

The recommended release source is the sibling clean checkout:

- `C:\Users\Ruslan\tm\terraforming-mars-release-main`

Do not deploy from the main working tree unless you explicitly intend to release that exact build.

## Hard Rules

- `prod` is promote-only. Do not deploy directly to `prod`; use staging first and then promote the tested artifact.
- Release source must be a clean git checkout. If `git status --short` is not empty, fix that before deploy.
- The main working tree `C:\Users\Ruslan\tm\terraforming-mars` is for day-to-day development, not the default release source.
- Do not hot-patch `build/*.js` or `assets/*` on the VPS. Emergency fixes must be carried back into source and re-released through staging.
- Trust `release.json`, not folder mtimes or guesses. Staging and prod should always be able to prove they serve the same artifact hash.

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
- `deploy_tm_server.ps1 -Environment prod` is intentionally blocked by default. Use `release_tm_prod.ps1` or `promote_tm_staging_to_prod.ps1`.
- If prod is already dirty and you need to stabilize it without an immediate restart, follow [README-live-cleanup.md](README-live-cleanup.md).
