# TM Live Cleanup Runbook

Use this when prod is running from a drifted VPS checkout and you do not want to restart immediately.

## Current Observed Prod State

As observed on `2026-04-14`:

- workdir: `/home/openclaw/terraforming-mars`
- service: `tm-server`
- running commit: `994243004`
- git status entries: `49`
- backup directories already present:
  - `build.bak-20260413141412`
  - `assets.bak-20260413141412`

This is a drifted runtime, not a clean release snapshot.

## Phase 1: Right Now, No Restart

Goal: keep the current process stable and stop adding more drift.

- Do not edit `/home/openclaw/terraforming-mars/src`, `/build`, or `/assets` directly.
- Do not run `git pull`, `git merge`, `npm run build`, or `systemctl restart tm-server` in the live checkout.
- Do not delete backup folders yet. They are useful evidence while the tree is still dirty.
- Ship new fixes only through the clean checkout `C:\Users\Ruslan\tm\terraforming-mars-release-main`.

Capture a quick snapshot before any future work on prod:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\capture_tm_live_state.ps1
```

If you want a saved snapshot artifact:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\capture_tm_live_state.ps1 `
  -OutputPath C:\Users\Ruslan\tm\artifacts\tm-live-snapshot.md
```

If the VPS checkout has accumulated `src/**` drift and `build.bak-*` /
`assets.bak-*` leftovers, you can do a safe archive-first cleanup without
restarting the service:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\cleanup_tm_checkout_artifacts.ps1 -Environment prod
```

This only:

- archives tracked `src` diff into `/home/openclaw/tm-prod-checkout-artifacts-<ts>`
- moves source-only leftovers and old backup dirs out of the live checkout
- restores tracked `src/**` to `HEAD`

It does not touch `build/`, `assets/`, `elo/`, or restart `tm-server`.

## Phase 2: First Safe Release Window

Goal: replace the dirty prod tree with a clean, staging-tested artifact in one controlled cutover.

1. Refresh and build the clean release checkout.

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars-release-main\scripts\refresh_tm_release_checkout.ps1
```

2. Deploy that exact artifact to staging and verify it.

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\deploy_tm_staging.ps1
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\verify_tm_server.ps1 -Environment staging -RequireReleaseManifest -CreateGame
```

3. On VPS, archive the current dirty prod tree before replacing it.

```powershell
ssh vps 'ts=$(date +%Y%m%d-%H%M%S); cd /home/openclaw && tar -czf tm-prod-dirty-$ts.tgz terraforming-mars'
```

4. Promote staging to prod. This is the single planned restart.

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\promote_tm_staging_to_prod.ps1
```

5. After cutover, verify that prod is now a real release artifact.

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\verify_tm_server.ps1 -Environment prod -RequireReleaseManifest
ssh vps 'cd /home/openclaw/terraforming-mars && git status --short'
ssh vps 'curl -I -s http://127.0.0.1:8081/main.js | sed -n "1,20p"'
ssh vps 'curl -I -s http://127.0.0.1:8081/vendors.js | sed -n "1,20p"'
ssh vps 'curl -I -s http://127.0.0.1:8081/chunks/player-input.js | sed -n "1,20p"'
```

Expected result after the clean cutover:

- `git status --short` in prod is empty or limited to known mutable runtime data outside the release tree
- `release.json` exists and matches the promoted artifact
- JS assets return `Cache-Control: no-cache, must-revalidate`

## Phase 3: After Cleanup

- Keep `prod` promote-only.
- Treat `/home/openclaw/terraforming-mars` as immutable release output.
- Keep mutable runtime data separate:
  - `db/`
  - `elo/`
  - `logs/`
  - `shadow-logs/` if enabled for the service
- If you need an emergency fix, patch source in the clean checkout, deploy to staging, then promote. Never hot-patch `build/*.js` in prod.

## Why This Matters

The last incident was not a simple bug in one source file. Prod was serving a mixed set of assets and server files built at different times from a dirty checkout. That makes client/server contract bugs much harder to reason about.

Commit `18a62ec` adds a guardrail for future clean releases:

- `main.js`
- `vendors.js`
- `chunks/*.js`

will now be revalidated on every load, which reduces stale-client mismatches after deploys. It only helps after a clean release includes that commit.
