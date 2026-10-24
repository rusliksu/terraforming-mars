# WP06 inventory — остальные страницы и проекции

Дата: 2026-10-24. Source pin: `988235122ffd61d8d1190e90beb2247afd252c00`.
Baseline: WP05 approved, HEAD `39ac7e271d`.

## Route inventory (current App.vue)

| Screen | Current component | Wrybit target | T |
|---|---|---|---|
| start-screen | StartScreen | pages/StartScreen.vue + pages/startScreen/** | T021 |
| load | LoadGameForm | pages/LoadGameForm.vue | T021 |
| games-overview | GamesOverview | pages/GamesOverview.vue | T021 |
| login-home | LoginHome | pages/auth/LoginHome.vue | T021 |
| admin | AdminHome | pages/admin/AdminHome.vue | T021 |
| help | help/Help.vue | pages/help/Help.vue + helpOverlay/** | T021 |
| the-end | GameEnd | pages/GameEnd.vue + gameend/** | T022 |
| stats | StatsPage (new route/component) | pages/stats/** + data/** | T023 |
| replay/card-maker/card-library/map-editor/map-library | native custom pages | keep native; wrapper/smoke | T024 |

`WrybitViews` currently exposes cards/playerHome/spectatorHome/inputs/create/createControls. It needs page fields with canonical fallback; App remains the routing authority.

## Component classification

- **StartScreen / menu/background:** source `components/StartScreen.vue` (273 lines), startScreen/* helpers, PageToolbar, MobileGlyph, shell background. Decision: adapt-view. Missing in current Wrybit: all startScreen utilities and serverIdentity helper. Assets already exist under `assets/buttons-homepage` and `assets/sidebar`; verify.
- **LoadGameForm / GamesOverview / AdminHome / LoginHome:** source pages are thin views over canonical admin/auth helpers. Decision: adapt-view with reused native admin components; do not change request handlers or permissions. AdminNav, GameOverview, ImportGameForm, ServerSettingsPanel, playerColumns and winCounts are already available natively.
- **Help / settings:** source help/Help.vue + helpOverlay/* and PreferencesDialog/LanguageSelectionDialog differ visually from native; decision adapt-view. Keep preferences storage and translation owner native.
- **GameEnd/Charts:** T022; not part of this slice.
- **Stats:** T023; requires typed public projections and explicit server routes.
- **Custom pages:** T024; preserve native components and no foreign API/AI.

## T021 slice order

1. Page registry + App dynamic fallback (no behavior change when Wrybit off).
2. LoadGameForm, GamesOverview, AdminHome, LoginHome with route fallback and browser smoke.
3. StartScreen/menu/background and its helpers.
4. Help dialog/overlay and Preferences/Language dialogs.
5. Update import-manifest statuses/evidence only for actually verified rows; keep full UI matrix rows open until their complete scenarios exist.

## Risks

- Admin/login must keep native guards and permissions.
- StartScreen helpers may touch viewport/meta and asset loading; isolate under Wrybit chunk.
- Help/settings must preserve current preferences and translation behavior.
- No game rules, AI, pricing, availability, saves or network handlers change in T021.

## Progress 2026-10-24

- Page registry added to `WrybitViews`/WrybitShell with App fallbacks for start-screen, load, games-overview, admin, login-home and help.
- `StartScreen` ported with startScreen helpers, planet stripes, toolbar and scroll/menu links; Wrybit start styles and assets added.
- Help route and `HelpOverlay` ported; HelpKeyboardShortcuts extensions section is intentionally empty in this fork.
- Wrybit PreferencesDialog/LanguageSelectionDialog ported and used by GameMenu; `experimental_layout` remains available in Advanced.
- LoadGameForm, GamesOverview, AdminHome and LoginHome adapted to Wrybit pages; native fetch/access behavior preserved and empty/error states checked.
- Verified: route matrix desktop/mobile, StartScreen (8 links/canvas), HelpOverlay (7 tabs), settings (5 groups/15 switches), shell fallback; vitest 285 files/1276 tests; ESLint/Stylelint/vue-tsc/build green. Evidence: `evidence-T021-20261024.md`.

