# Independent review — WP06 (T021–T024)

Date: 2026-10-24
Reviewer: independent reviewer (reviewer-wp06, profile reviewer-renata)
Worktree: `C:/Users/Ruslan/.codex-worktrees/terraforming-mars-release-main-wrybit-full-ui`
Branch: `codex/wrybit-full-ui`
Review HEAD: `3961488db993426e95ce36df0784c8c120879588`
Range: `39ac7e271d..3961488db9`

**Verdict: REQUEST CHANGES.**

The implementation is runnable and the optional mode is gated correctly, but WP06 is not a complete port of the scoped Wrybit pages. T022 and T023 are marked done while their source child views are absent; the import/coverage ledgers are still open.

## Scope and checks

| Commit | Subject |
|---|---|
| `a4db07f229` | start WP06 page registry and StartScreen |
| `84f766bed9` | help/settings surfaces |
| `68c30358a5` | T021 pages and route evidence |
| `9ed2a9a866` | T022 GameEnd |
| `636931dd15` | T023 statistics projection |
| `3961488db9` | T024 custom pages and foreign-api cleanup |

Changed files are UI/bookkeeping only; no game rules, Game/Player, AI/SmartBot, card effects, saves, pricing, availability or native network handlers in the range. That part of the boundary is clean.

Checks actually run at this HEAD:

- `npx vitest run --silent`: **287 files / 1280 tests passed** (19.47 s).
- `tests/routes/ApiWrybitStats.spec.ts`: **3 passing**; `tests/server/requestProcessor.spec.ts`: **10 passing**.
- ESLint/Stylelint/vue-tsc on changed scope: passed.
- `npm run build:client`: passed; only the pre-existing three webpack size/performance warnings.
- `git diff --check`: 3 blank-line-at-EOF warnings in evidence/inventory docs.
- Full `npm run test:server` cannot run in this environment because `better-sqlite3` was built for NODE_MODULE_VERSION 127 while Node 24 requires 137; this is environmental and was not caused by WP06.

Inspected browser evidence and performed an independent Playwright smoke for the custom pages at desktop/mobile; all five native custom routes rendered their roots with Wrybit active, `overflow=false`, console 0, and the Classic-layout switch kept `/card-maker` working.

## Blocking findings

### F1 — High — T022 is not the scoped Wrybit GameEnd port

The manifest and WP06 inventory expect `src/client/wrybit/pages/GameEnd.vue` **plus** `gameend/**`. Current state:

- `Test-Path src/client/wrybit/pages/gameend` → `False`.
- Missing targets: `GameEndChartTabs.vue`, `GameOverNotice.vue`, `VictoryPointChart.vue`.
- `src/client/wrybit/pages/GameEnd.vue` is a 639-line copy of the classic `src/client/components/GameEnd.vue`, with a new toolbar/header and CSS overrides. It has no source imports/classes `GameEndChartTabs`, `GameOverNotice`, or `game-end-columns__main`.
- Source Wrybit GameEnd uses the two-column `game-end-columns` layout, source charts/tab component, board zoom and source solo/media treatment. The current page shows a vertical classic-layout result stream with partial styling.

The local browser smoke shows results are reachable, but that does not satisfy the scoped source port. T022 should not be marked complete until the source child views are ported or an explicit, user-approved scope reduction is recorded.

### F2 — High — T023 is only a reduced statistics page, not the scoped source port

The source StatsPage has 11 tabs and child views (`overview`, `games`, `players`, `corporation`, `prelude`, `card`, `combinations`, `milestone`, `award`, `board`, `records`) plus entity/detail/top/chart/zoom views. WP06 inventory expects `src/client/wrybit/pages/stats/** + data/**` and UI-18 explicitly says “all child representations”.

Current state:

- `src/client/wrybit/pages/stats/` contains only `StatsPage.vue`.
- Missing source tabs/components include `StatsOverview`, `StatsGamesView`, `StatsPlayersView`, `StatsRecordsView`, `StatsCombinationsView`, `StatsEntityList`, `StatsEntityDetail`, `StatsTopView`, `StatsCardZoom`, and the chart/table helpers.
- The implemented page has six tabs and no entity detail/top/combination views; T023 evidence itself notes the source tabs for cards/preludes/milestones/awards are absent.
- A reduced public ELO projection is a reasonable start, but it does not match the accepted “all child views” scope merely by adding a typed endpoint.

T023 should be rejected or its scope formally narrowed with a documented acceptance decision; current `[x] T023` is unsupported.

### F3 — High — Import manifest and coverage ledger are not closed

WP06 step 5 requires updating manifest statuses/evidence only for verified rows, and WP06 acceptance requires checks closed in `contracts/stage-coverage.md`.

Current ledger state:

- All **54** WP06 entries in `src/client/wrybit/import-manifest.json` are `"status": "planned"`; none are implemented/passed and all evidence arrays are empty.
- **40** of those 54 expected targets do not exist.
- `contracts/stage-coverage.md` still has the WP06 row **“Открыто”**; `contracts/ui-coverage.md` still has UI-01/03/17/18/19/20/21 open.

This makes it impossible to distinguish intentional native reuse from missing source views, and it leaves the WP06 checklist objectively incomplete. Update the ledgers for actually verified rows and keep unverified rows open with an explicit owner. Do not mark all 54 as done merely because routes load.

### F4 — Medium — Changes outside WP06 owned files have no recorded handoff

WP06 `owned_files` cover pages, data, `WrybitUi*` models, `ApiWrybit*` routes, requestProcessor, paths and matching tests. The range also changes:

- `src/client/components/App.vue`
- `src/client/wrybit/shell/{WrybitShell,presentationViews}.vue/ts`
- `src/client/wrybit/visuals/gameMenu/**`
- `src/client/wrybit/create/{InfoLink,wikiContent}.*`
- `src/styles/common.less`, `src/styles/wrybit/**`
- `assets/**`
- `tests/client/wrybit/shell/**`, `tests/client/wrybit/audit/**`

Some of these are necessary integration edits and some are owned by earlier WPs, but there is no recorded ownership/handoff note. Add the handoff rationale or move the edits to the responsible WP before merge.

## Non-blocking observations

- `ApiWrybitStats` correctly limits the response to public ELO fields; the route/projector tests cover `_key`, `startedTime` and unknown-field stripping.
- T024 correctly removed the external `raw.githubusercontent.com` wiki fetch; the static audit test covers external fetches/AI/network transports.
- The custom-page browser smoke is good, but creation/submission and real replay frames were not exercised.
- `git diff --check` reports blank lines at EOF in three WP06 evidence/inventory docs; fix before merge.
- The full server suite is blocked by the pre-existing better-sqlite3 ABI mismatch, not by these changes.

## Required before approval

1. Complete T022 with the source GameEnd child views and two-column/result layout, or obtain an explicit scope reduction.
2. Complete T023 with the source stats child/detail views and a public projection that supports them, or obtain an explicit scope reduction; do not invent missing data.
3. Update the WP06 import manifest statuses/evidence and the WP06/stage/UI coverage rows; leave unsupported rows open with an explicit owner.
4. Record the ownership handoff for files outside WP06’s declared surface.
5. Re-run client tests, type/lint and build; report the full-server environment limitation separately.
