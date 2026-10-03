# WP02 server port evidence

Source: corrected fanmade reference `8d5a68deb229b6e77c990e2ae0a6764ceb0a44bd` (pinned PRs 1-14 each once). Target base: `4ea59edde3ea2a2821ac95da6d10a857eff8f1be`. Implementation: lane-a, starting from `42e2d4f6614da2ad414dba59bdab111b3ec799cb`.

## Reconciliation

- Applied source delta from common ancestor `17dbc9dc26f380260b743a3db7021537d3790e4f` for common/server/backend tests; resolved 22 textual conflicts semantically.
- Retained target dependencies, admin game APIs/loaders, archive/hydration/history budgets, injected saving, bot/surrender/replay and input sequencing. Imported library tables/adapters independently of source destructive game administration.
- Added expansion defaults for legacy create requests and saved options, custom board handling, twelve expansion registrations, additional research continuation, tracks/boards/libraries, and public replay projections without team player access IDs.
- Kept target custom-card compatibility filtering and Mineral Deposit replacement; custom library cards use the canonical all-manifest registry.
- Preserved target policy descriptions and target log/undo tests; imported source backend regressions.

## Confirmed bugs fixed while integrating

| Defect | Reproduction / regression | Resolution |
|---|---|---|
| Research undo loses Budget Restrictions / next-research keep cap | New ResearchPurchaseUndo tests both failed with reopened max 4 | Persist optional keepMax in undo state and share cap calculation |
| Seebeck energy and heat double counted against reservations/payment | SistemasSeebeck: E3 reserved for action also usable as heat money; mixed E2/H2 with pool3 | Shared-pool validation and aggregate reservations |
| Energy payment accepts heat then fails to deduct it | SistemasSeebeck: E0/H3, energy payment3 leaves H3 | Thermal spending consumes the actual alternate stock |
| Both heat/energy monetary flags double-value Seebeck pool | SistemasSeebeck E2 evaluated as 6 MC instead of4 | Maximum affordability uses the better conversion once |
| Stormcraft-supported energy trade finishes unpaid | SistemasSeebeck E1/F1 trade already has visitor before payment | SpendEnergy returns a continuation; all callers propagate it |
| Stormcraft heat input excludes usable Seebeck energy | E6/F1 heat8 input max0 | Heat input includes combined stock and validates current resources |
| One Stormcraft floater funds both heat and generic floater channel | GasMine: MC16/F1 payment MC16/H2/F1 accepted | Validate shared resources, value once, reserve distinct floaters, resolve costs first |
| Port fix changed selected heat payment to energy-first | H5/E5 heat1 reduced E instead of H | Deduct selected stock first, use substitution only for shortfall |
| Floater-funded trade reports incomplete structured expense | Trade E1/F1 emits structured E1 | Omit structured expense when unsupported floaters were used |
| Reservation rounding rejects valid allocation | H1/F1, reserveH2 + payH1; existing LocalHeatTrapping also failed | Reserve whole floaters before attributing overpayment; positive and negative split cases covered |

Every row has a failing test result captured before its corresponding fix. Review examples that violated the single-resource Behavior.spend type were retracted, not treated as bugs.

## Verification and limits

Node 22.23.3 via explicit npm shim. Backend TypeScript and targeted gameplay tests pass. Latest focused set: 44 passing (SistemasSeebeck, LocalHeatTrapping, GasMine). Research/Stormcraft/replay focused set also passed. Full server final run and final lint status recorded below when complete.

Full test compilation currently includes client-only failures expected until WP03 (JSONProcessor expansion map, old client payment fixtures). Backend-only TypeScript configuration includes every non-client spec and setup, excludes tests/client, and passes without changing the checked-in compiler configuration.

Server test prerequisites: make:static and an actual esbuild bundle of src/client/sw.ts into build/sw.js (the empty service-worker webpack entry); full client build remains WP03. Initial 2-second parallel archive timeouts resolved with --jobs 4 --timeout 15000. No production/service/database operation was performed.

Additional save/resume combinations, old-wire payment normalization, advisor capability boundaries and all inventory dispositions remain WP04. Full client and browser acceptance remain WP03/WP05.

## Final WP02 checks

Implementation commit: `dd86774c80d6902b6282db32063aab7996abeb65` (1,270 files; source module files and tests dominate this additive patch).

- Full server suite: **10,928 passing, 3 platform-conditional pending**, exit 0, Node22 with four workers and 15s bound. Log: `fanmade-port-target-full-server-final.log`.
- Server build, all backend-spec TypeScript compilation and backend/common ESLint passed before the final isolated replay patch.
- Replay omission reproduced: custom board rows undefined; then added explicit public parameter/bonus, board-row, Epsilon and blocked-Delta projections. New test also verifies team player IDs, private hand cards and unexpected parameter fields remain absent. Server build plus replay frame/view/archive suite: **9 passing**, exit0. Scoped replay ESLint passed. Log: `fanmade-port-replay-green.log`.
- Git staged whitespace check passed; lane clean after commit. No client change yet.
- Independent review identified and validated the fixes above. Final fixed-commit review pending; no overall mission completion claim.
