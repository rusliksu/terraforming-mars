# WP03 client integration evidence (in progress)

Workspace lane-b, based on approved WP02 dd86774c80. Source client/style/assets/locales/tests delta from ancestor17dbc9 to corrected8d5a68, with 17 non-admin textual conflicts resolved. Target game administration retained; only map/card library navigation added to GamesOverview.

## Verified adaptation fixes

- Fan module toggles now use target custom-list reconciliation. The regression first retained disabled Wellness Deluxe, then passed after fix.
- Three custom map codes round-trip through target templates, display the decoded map names and clear on reset. Before-fix template omitted the codes.
- Imported team assignments no longer get replaced by queued watchers. Six-player team colors are unique; profile selection cannot overwrite team-controlled colors. Profile test was strengthened with a valid preferredColor fixture; a guard-removal mutation is killed (exit1).
- Clear custom lists removes active overrides/exclusions consistently with target settings.
- Target card-list agenda descriptions remain always visible. Source hidden-until-clicked test was adapted to the explicitly preserved target behavior; popup behavior is unchanged.
- Initial-card setup forwards custom tracks/rows and displays Venus surface, High Orbit market and teams. Regression reproduced missing rows before fix.
- Dynamic custom cards remain in played-card filters; PlayerHome resolves their metadata without static-manifest failure. Unit and owner-view regressions reproduced disappearance, then pass.
- Mobile editors reproduced horizontal page overflow at390px: Mars1025px, Moon958px, CardMaker765px. Controls/canvas now fit; large boards scroll inside previews. A second inspection found absolute track markers escaped the scroll container; positioned preview establishes their containing block. Final browser verification pending final build.

## Checks so far

Full lint (ESLint, i18n, Vue types, styles), full build, full test compilation passed. Latest full client run: 183 files,999 tests passing; existing jsdom alert-not-implemented diagnostic. Three existing webpack size/performance warnings. Final CSS-only containing-block change is undergoing rebuild and browser check.

Playwright CLI0.1.17/Node22, isolated session fanmade-port-wp03 and local server127.0.0.1:8097, task-only SQLite directory D:/tm-db/fanmade-port-01M3J328-wp03. Two actual two-player games created via UI: Chairman+MoreParties+VenusPhase2 and Random+MoreParties+VenusPhase2. Chairman popup shows all six options for selected Bureaucrats (2 bonuses/4policies), marks current selections, closes with Escape. Random popup shows exactly six current policies and no bonus section. Both checked visually at1440px/390px; popup bounds at390 are x16,width358.

Local Node server lacks the reverse-proxy ELO routes: initial /elo/data.json and /elo/elo-data.json returned404. Subsequent UI checks use explicitly empty local fixture responses for only those two ELO requests; no real account/player records fetched. Spectator, library and editor pages report0 console errors/warnings. No gameplay/server APIs mocked.

## Deferred WP04 boundaries

- ReplayFrame publicCard currently omits dynamic customCard metadata; reproduce/fix against public replay privacy contract.
- Old payment payloads/recorded replay inputs lack two new resource fields; test legacy normalization.
- Target rematch and quick-game contracts need custom board/team round-trip coverage.
- Conglomerates currently uses individual MC for equal team-VP UI ordering, inherited source behavior. No authoritative team-MC tiebreak found; do not invent a rule. Record as source rule ambiguity, not a confirmed gameplay fix.

No production deployment, external library publication, or live data import performed.

## Final WP03 evidence

Commit ac91b69b5f31a62d66a20ebf8723c7643a1c98f5. Full lint and test compilation pass. Full client: **999 tests /183 files passing**. Full build passes; final two CSS containing-block edits also pass stylelint and webpack rebuild. Git whitespace check passed.

Final fresh-server browser widths at390px: Mars editor390, Moon editor390, Venus editor390, CardMaker390; each reports0 console errors/warnings. Screenshots visually inspected and retained under research/screenshots. CardMaker preview shows the typed name PORT SMOKE CARD. Library -> open Tharsis in editor -> rename Port smoke map -> Play with this map -> create form retains custom selection and name.

A third finite local UI game was created: 4 players with the edited custom board, Conglomerates, High Orbit and VenusPhase2. Its initial-card screen shows all three new widgets and no console errors. Other browser fixtures cover Chairman and Random agendas as above. Browser session and local server were stopped after checks. All DB files remain isolated on D:, no live state touched.

Review blockers for played custom cards and initial fan widgets were reproduced and fixed. Independent final review is requested against the fixed SHA.
