# Independent review — WP05 (T017–T020)

Date: 2026-10-23 (initial review); re-review and final verdict 2026-10-24
Reviewer: independent reviewer (reviewer-wp05)
Worktree: `C:/Users/Ruslan/.codex-worktrees/terraforming-mars-release-main-wrybit-full-ui`
Branch: `codex/wrybit-full-ui`

Review history:
- Initial review at HEAD `c80e82ee9e` (WP05 product commits + auto-open delta): **REQUEST CHANGES** — one high-severity carousel defect (F1) and one medium dead-end tile (F2).
- Fix commit `359e57256b` “fix(ui): address WP05 independent review findings” on top of `c80e82ee9e`.
- Re-review at HEAD `359e57256b`: **APPROVE** (F1 and F2 verified fixed; F3/F4 accepted as non-blocking follow-ups).

**Final verdict for HEAD `359e57256b918ca22343d62cc069c6e6c71386c9`: APPROVE.**

## Scope and commits reviewed

| Commit | Subject | Role |
|---|---|---|
| `f2db308cae` | feat(ui): add mobile turn sheet and card carousel | T017 product |
| `f25da9b801` | feat(ui): add Wrybit spectator home and mobile spectator | T018 product |
| `24f5862f64` | fix(ui): keep mobile input through resize and step refresh | T019 product |
| `c80e82ee9e` | feat(ui): auto-open mobile action sheet on new step | auto-open delta |
| `359e57256b` | fix(ui): address WP05 independent review findings | F1/F2 fix delta |

Bookkeeping commits reviewed for scope only: `deadc1ea7a`, `1240e85d15`, `fded130a1c`, `41b4fbe6f6`, `fee1d0ba22`.

Fix delta `c80e82ee9e..359e57256b`: 6 files, +123/−8, all under `src/client/wrybit/{mobile,visuals}`, `src/styles/wrybit/mobile.less` and `tests/client/wrybit/mobile/`. No changes under `src/server/**` or `src/common/**`. No game-rule, AI/SmartBot, card-effect, pricing/availability, save or network-handler changes in the WP05 range.

## Checks actually run

### At initial HEAD c80e82ee9e
- `npx vitest run` — **283 files / 1271 tests passed** (also repeated with `--silent`, 15.88 s).
- `npx eslint` on the 11 changed WP05 files — **exit 0**.
- `npx vue-tsc --noEmit -p tsconfig.vue-tsc.json` — **exit 0**.
- `npm run build:client` — **success** (webpack 5.111.1, 37.2 s; only the 3 pre-existing bundle-size warnings).
- `npx stylelint src/styles/wrybit/mobile.less` — **exit 0**.
- Independent Playwright smoke on a proof bundle rebuilt from that HEAD (ports 8111/8112, 360×800, native 8099 untouched):
  - initial action-menu page: `sheet=false`, Mars visible — no initial auto-open;
  - Save on “Play cards”, server returns “Take your second action”: `sheet=true`, title “Take your second action”, 5 tiles, Mars underneath;
  - backdrop close: `sheet=false` and stays closed;
  - placement Save: `sheet=false`, turn task “Select space for capital tile”, no dots.
- Independent carousel measurement exposed F1: `scrollLeft=0`, item centers −88/180/710 vs center 180; first card (Ants) checked off-screen, second card centered, dots 2/3.

### At fix HEAD 359e57256b
- `npx vitest run --silent` — **284 files / 1274 tests passed** (20.95 s).
- `npx eslint` on `cardCarousel.ts`, `turnMenu.ts`, `PlayerHome.vue`, `CardCarousel.spec.ts`, `TurnMenu.spec.ts` — **exit 0**.
- `npx vue-tsc --noEmit -p tsconfig.vue-tsc.json` — **exit 0**.
- `npm run build:client` — **success** (webpack 5.111.1, 25.9 s; same 3 pre-existing warnings).
- `npx stylelint src/styles/wrybit/mobile.less` — **exit 0**.
- Independent Playwright re-check on a proof bundle rebuilt from `359e57256b` (port 8113, 360×800):
  - initial Play-cards state: `scrollLeft=527`, `clientWidth=318`, viewport center 180; **Ants center=180, checked=true, dots “1 / 3”**;
  - dot 2: **Birds center=180, checked=true, dots “2 / 3”**;
  - dot 1: **Ants center=180, checked=true, dots “1 / 3”**;
  - page overflow false; screenshot `D:/tm-db/smartbot-lab/wrybit-full-ui-01a126c8/visual-proof/review-wp05fix-carousel-360.png`;
  - reload of the fix build: `sheet=false`, mobile layout, Mars active — initial load still does not auto-open.

## Fix delta review

### F1 (was HIGH / blocking) — RESOLVED

- `src/styles/wrybit/mobile.less:897`: carousel rule now sets `justify-content: flex-start !important`, overriding the centered flex layout at line 886. The existing symmetric padding (`calc(50% - 124px)` = 35 px at 360 px width, 35 + 124 = 159 = half of 318) now centers the first and last playable cards correctly.
- `src/client/wrybit/mobile/cardCarousel.ts`: selectors no longer depend on `:has()`/`:scope`; `visibleList` excludes the standard-project grid by checking for `.card-standard-project`, and `items` filters direct `label.payments_cards` children. A one-tick `syncInitialSelection` (lines 83-89, 100-107) now aligns the native selection with the centered card when the list appears, so an off-screen native default cannot survive the first layout.
- Regression test `tests/client/wrybit/mobile/CardCarousel.spec.ts`: checks that an off-screen native choice is replaced by the centered card on initial layout and that `scrollCarouselTo` selects the dot target before scrolling.
- Independent evidence above: initial/dot-1/dot-2 states now have checked card center = 180 = viewport center; dots match. The previous wrong-card Save path is closed.

### F2 (was MEDIUM) — RESOLVED

- `src/client/wrybit/mobile/turnMenu.ts:131-149`: `buildTurnMenu(input, hasCeoCards = false)` mirrors the native grouping: when `hasCeoCards && actionsIndex !== -1 && ceoIndex !== -1`, the separate CEO tile is filtered from the order, so no tile points at the CEO tab that `OrOptions.vue:146` removes.
- `src/client/wrybit/visuals/PlayerHome.vue:220-225`: passes `ownCeoCards(thisPlayer).length > 0`, the same predicate `OrOptions.vue:141` uses for `actionsGrouped`.
- `tests/client/wrybit/mobile/TurnMenu.spec.ts`: covers both the grouped case (CEO tile absent, Actions tile present) and the separate case (CEO tile present).
- Edge alignment checked by inspection: when only the CEO option exists (`actionsIndex === -1`), native `tabOrder` does not filter it and `groupedCeo` stays false, so the CEO tile remains — matching the rendered tab.

### F3 (LOW) — accepted follow-up, unchanged

Auto-open still uses the one-shot module flag `pageJustLoaded` (`PlayerHome.vue:143-145, 166-181`) with no prompt-id identity. Verified behavior at both HEADs: initial load does not auto-open; a newly delivered action menu does; close stays closed in the normal mandatory-input flow (no waiting-for poll while the input is pending). Residual theoretical case: any later remount while the same action menu is still pending (e.g. an error-recovery `updatePlayer`) would reopen the sheet. **Accepted as a non-blocking follow-up.**

### F4 (LOW) — partially addressed, remaining gaps accepted as follow-ups

- Added: carousel initial-sync/dot regression (`CardCarousel.spec.ts`, 2 tests) and CEO grouped/separate regression (`TurnMenu.spec.ts`).
- Still not covered: learner-mode filtered option indices in the sheet (currently safe by duplicated identical predicate, but untested dynamically), filter-hidden cards in the carousel, and auto-open prompt-id behavior. **Accepted as non-blocking follow-ups.**

### F5 (new, LOW) — last carousel dot does not center the unavailable card

- Observed on the fixed build at 360×800: after dot 3 (the unplayable card), `scrollLeft=1325` (max 1328) and the unplayable card center is −82 vs viewport center 180; the card is mostly off-screen. Playable dots 1 and 2 are correct.
- Cause: the carousel list also contains non-label flex children (`.card-filter-bar`, intro slot, warnings/payment host) that receive `flex-basis: 100%` (`mobile.less:916-919`), creating extra gaps; `scrollIntoView({inline: 'center'})` overshoots to the scroll end for the last item.
- Impact: cosmetic/UX only for the “not playable” dot; there is no radio input, so no off-screen selection or wrong-card save. **Accepted as a non-blocking follow-up**; optionally hide the unplayable card from the carousel/dots or use a computed `scrollLeft` target rather than `scrollIntoView`.

## Subtask assessment at 359e57256b

- **T017:** sheet builds from native OrOptions; tile selection and inline confirmation paths unchanged and previously smoke-verified; carousel initial selection and playable-dot centering now correct (F1 resolved); CEO tile no longer a dead end (F2 resolved). F5 is a residual unplayable-dot cosmetic issue.
- **T018:** routing and classic fallback unchanged by the fix commit; `App.vue` uses the Wrybit spectator only when the optional chunk is ready, `WrybitShell` registers it, mobile/desktop spectator mount no hand/turn/input and keep the native spectator poller. Verified by code plus the T018 proof.
- **T019:** observer lifecycle and `$nextTick`/HTMLElement guards unchanged; placement step opens the turn task; carousel resume now re-syncs to the centered card, which is consistent with the retained-selection requirement. Full resize matrix remains proof-backed.
- **T020:** privacy unchanged; no player/action endpoints, no hand/turn/input; canary not rendered per proof. Verified by code plus the T020 proof.

## Verified vs unverified gap (final)

Verified directly at `359e57256b`:
- Full client vitest, ESLint, `vue-tsc`, production build, Stylelint.
- F1 initial/dot-1/dot-2 carousel geometry and selection at 360×800.
- Initial page load does not auto-open the sheet.
- Fix diff scope: no server/common changes; only UI/tests.

Verified at `c80e82ee9e` and unchanged by `359e57256b`:
- New action-menu step auto-opens the sheet; backdrop close stays closed; placement step opens the turn task. The fix commit changes only `menu` construction (adds the CEO flag), not the auto-open condition; the initial-load no-auto-open path was rechecked at the fix HEAD.

Verified only from proof JSONs / code inspection (not re-run by me):
- T018 desktop/mobile spectator and classic fallback; T020 canary/private-data and network endpoint set; T019 full resize matrix and scroll metrics.

Not verified:
- F2 in a real browser with a CEO fixture (no CEO cards in the harness); verified by code alignment and unit test.
- Learner-mode dynamic index path and filter-hidden-card carousel behavior (both residual F4 risks).
- F5 was measured, not fixed; accepted as non-blocking.
- Server-side mocha/integration tests (task required full vitest client suite, which was run).

## Notes

- Product files were not edited and no commits were made by this reviewer. The only file written by the review is this report.
- Worktree contains mission bookkeeping edits (`status.json`, `status.events.jsonl`, WP05 closeout) authored by the implementation/Lead side, not by this review.
- No gameplay/AI/pricing/availability/save/network-handler regression found in the reviewed range.
