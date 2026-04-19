# TM runtime services

Versioned systemd templates for the VPS user services that run the live TM
stack:

- `tm-server.service`
- `tm-server-staging.service`
- `tm-elo.service`

## Sync to VPS

Dry-run:

```powershell
pwsh -File .\scripts\sync_tm_runtime_services.ps1 -DryRun
```

Apply updated unit files on the VPS without restarting the services:

```powershell
pwsh -File .\scripts\sync_tm_runtime_services.ps1
```

What the sync script does:

- reads current `SERVER_ID` values from the installed `tm-server` and
  `tm-server-staging` services
- points runtime services at immutable release symlinks:
  - `/home/openclaw/tm-runtime/prod/current`
  - `/home/openclaw/tm-runtime/staging/current`
- inlines `TM_AUTO_JOIN_SCRIPT`, `SHADOW_LOG_DIR`, and staging `TM_SERVER_URL` into the main unit files
- writes the rendered unit files into `~/.config/systemd/user/`
- removes the old drop-ins that only carried those env vars
- runs `systemctl --user daemon-reload`

It does not restart `tm-server`, `tm-server-staging`, or `tm-elo`.
