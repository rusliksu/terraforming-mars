# Corrected source reference

- Target baseline: `4ea59edde3ea2a2821ac95da6d10a857eff8f1be`.
- Fanmade baseline: `be1ae440e62a01ecf77eb345e6d153ca60e643df`.
- Corrected source: `8d5a68deb229b6e77c990e2ae0a6764ceb0a44bd`, branch `codex/fanmade-source-reference`.
- All fourteen PR heads in `source-pins.json` are Git ancestors of the corrected source. Each was merged once, in PR-number order, without conflicts.
- Reference checkout: `C:/Users/Ruslan/.codex-worktrees/terraforming-mars-fanmade-full-port-owned-fanmade-source-reference`.

## Validation on Node 22.23.3
Dependencies installed from lockfile with scripts disabled. Only existing better-sqlite3/esbuild installation scripts were explicitly run for the Node 22 runtime. A task-local npm/npx launcher ensures nested npm scripts use Node 22 rather than the system Node 24 executable.

| Check | Result |
|---|---|
| make:static | exit 0 |
| lint (ESLint, i18n, Vue types, styles) | exit 0 |
| build (server and client) | exit 0; webpack asset-size/runtime warnings |
| build:tests | exit 0 |
| test:server | exit 0; 10,407 passing |
| test:client | exit 0; 169 files, 784 tests passing; jsdom alert-not-implemented diagnostic |
| reference working tree after checks | clean |

Logs: local temporary `fanmade-port-source-{make-static,lint,build,build-tests,test-server,test-client}.log`. These results establish the source oracle only, not target acceptance.

Target baseline also passed make:static, build:server and build:tests on Node 22 before code transfer.

## Capability inventory
`research/source-files.csv` classifies 1,441 source changes by module/boundary, with blob identities, rename origins and explicit dispositions. Administrative purge controls are retained from target; mixed database files import library support only. Transfer status remains planned until target verification. `research/module-inventory.json` records exact card names from the compiled source manifests: 475 entries across eleven static manifests; Custom Cards is the twelfth module and uses its dynamic library. Non-module functionality includes configurable Mars/Moon/Venus maps and editors, map/card library codecs and routes, parameter tracks, variant options, milestones and awards. They remain in the inventory and are not excluded as tooling.

## Source limitations
- `SpomePolicy04` exposes an explicitly unimplemented EPIC town/city-track policy. Preserve its disclosed limitation; do not invent the missing expansion.
- `GreatMartianArchives` implements tableau-only wild tags; the source comment explicitly omits printed hand-tag behavior. This is a known source limitation, not verified full printed-rule fidelity.

## Adaptation review
Independent read-only review identified contracts in `research/target-contracts.md`; parent inspection independently confirmed the research-limit and archive-deletion mismatches. These are work items for reconciliation, not claims about bugs already present in an accepted target port.

## Ownership recovery
The mission's active authoritative checkout is `C:/Users/Ruslan/.codex-worktrees/terraforming-mars-fanmade-full-port-owned`, an independent clone of the same task branch with its runtime history preserved. This avoids Spec Kitty 3.2.7 linked-worktree placement bugs without changing its gates. The earlier task worktree is retained and inactive; the release checkout remains clean.
