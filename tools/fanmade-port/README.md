# Fanmade catalog source gate

`check-catalog-source.js` fingerprints every reviewed source (`src/common`, `src/server`,
`package-lock.json`) and fails when the tree no longer matches
`fanmade-catalog-source-manifest.json`. It runs inside `npm test` through
`tests/models/FanmadeCatalogRevision.spec.ts`.

A reviewed source edit makes the gate red on purpose. Refresh the digests with one command:

```bash
node tools/fanmade-port/check-catalog-source.js --write
```

The command rewrites only the `files` digests, keeps `bundleDigest`/`identities` untouched,
and prints which files changed, were added or were removed:

```json
{"catalogId":"fanmade:rebalanced-v1","written":"...","files":2592,
 "changed":["src/server/routes/ApiCreateGame.ts"],"added":[],"removed":[]}
}
```

A failing check now lists every stale file and the exact command, so the diff stays
reviewable instead of guessing which file broke.

`--source <dir>` and `--manifest <file>` point the tool at a fixture tree (used by the spec).
