# Player Color Change Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make player color/persona change requests repeatable, reviewable, and testable without rediscovering every UI surface.

**Architecture:** Today player colors are intentionally simple at runtime but scattered in source: TypeScript defines valid colors and locked identities, Less defines visual treatments, ELO aliases define canonical names, and a few UI/server files define symbols, chart colors, badges, and Telegram labels. For each request, update only the layers that match the requested scope, then prove the change on staging before prod.

**Tech Stack:** TypeScript, Vue 3, Less, Mocha/Chai, PowerShell deploy scripts, Terraforming Mars custom server release flow.

---

## Request Intake

Before editing, classify the request into exactly one of these scopes:

1. **Palette-only change:** same player/persona, same slug, same aliases; only color values/readability change.
   Example: "make GydRo pearl counters darker" or "make Vanger green less bright".
2. **Existing persona replacement:** same person, possibly new color slug or new display color; aliases may stay.
   Example: "Тома теперь не hydro, а saturnstorm".
3. **New reserved persona:** new player/person needs a locked name/color/aliases.
   Example: "Вангер: RGB 0,255,0".
4. **Standard base color change:** one of `red`, `blue`, `green`, etc. This is higher-risk because it affects ordinary games, not just reserved personas.

Collect these fields in the issue/chat before implementation:

```text
person/display name:
canonical ELO name:
color slug:
RGB:
HSV/HSL if provided:
light/dark helper colors:
symbol overlay glyph:
Telegram label:
aliases:
surfaces to verify: overview, board cubes, colonies, turmoil, ELO, game end chart, create-game form
prod target: staging only / prod after approval
```

---

## File Map

### Identity And Valid Colors

- `src/common/Color.ts`
  - Defines reserved color constants, names, `RESERVED_PLAYER_COLORS`, `PLAYER_COLORS`, `Color`, `LOCKED_PLAYER_IDENTITIES`, and identity lookup helpers.
  - Required for new reserved personas or slug changes.

- `elo/player_name_aliases.json`
  - Maps nick aliases to canonical ELO names.
  - Required when names/aliases change.

- `src/server/TelegramBot.ts`
  - `COLOR_LABELS` for Telegram game/turn messages.
  - Required when a new slug should have a human-readable Russian color label.

### Core Visual Tokens

- `src/styles/variables.less`
  - Primary `@player_<slug>` RGB.
  - Optional `@player_<slug>_light`, `@player_<slug>_dark`.
  - Token gradient `@player_<slug>_token_gradient`.
  - Sprite filters: `@player_<slug>_sprite_filter`, `@player_<slug>_fleet_filter`, `@player_<slug>_delegate_filter`.

- `src/styles/mixins.less`
  - `.player_<slug>_bg_translucent()` for player overview rows and translucent surfaces.

- `src/styles/common.less`
  - `.player_bg_color_<slug>`.
  - `.player_translucent_bg_color_<slug>`.
  - Readability overrides for player name, corp, log labels, table cells, game-end name, tag counters, resource stock counters, production counters.

- `src/styles/create_game_form.less`
  - `.player_translucent_bg_color_<slug>` preview treatment in Create Game player fields.

### Board, Colonies, Turmoil

- `src/styles/board.less`
  - `.board-cube--<slug>` sprite selection/filter.
  - `.board-cube--<slug>.board-cube--persona::before` token gradient.
  - `.board-cube--<slug>.overlay::after` symbol overlay.
  - Underground/excavator token gradients where present.

- `src/styles/player_home.less`
  - `.player_shadow_color_<slug>`.
  - `.grid-item.player_tag_bg_color_<slug>`.
  - `.ma-score.player_bg_color_<slug>` readability for milestones/awards.
  - `.colonies-fleet-<slug>` fleet sprite/filter.
  - Any overview-specific background readability.

- `src/styles/turmoil.less`
  - `.player-token.<slug>` delegate sprite/filter/number readability.

### UI Metadata

- `src/client/utils/playerSymbol.ts`
  - Symbol overlay glyph for `symbol_overlay` preference.

- `src/client/components/gameend/VictoryPointChart.vue`
  - `COLOR_CODES[slug]` for game-end VP chart.

- `src/client/components/overview/PlayerEloBadge.vue`
  - Optional persona badge class `.player-elo-badge--<slug>` if the player has a custom ELO badge.

### Tests

- `tests/Style.spec.ts`
  - Main regression test for reserved persona color coverage.
  - Add/update expectations for every touched surface.

- `tests/routes/ApiCreateGame.spec.ts`
  - Only needed when changing valid colors, locked identity behavior, or create-game identity mapping logic.

---

## Task 1: Classify The Color Request

**Files:**
- Read: `src/common/Color.ts`
- Read: `src/styles/variables.less`
- Read: `tests/Style.spec.ts`
- Modify: none

- [ ] **Step 1: Check current workspace state**

Run:

```powershell
git status --short --branch
```

Expected:

```text
## <branch>
```

If there are existing modified files, treat them as user/current-session work. Do not revert them. If they overlap color files, read the diff first:

```powershell
git diff -- src/common/Color.ts src/styles/variables.less src/styles/common.less tests/Style.spec.ts
```

- [ ] **Step 2: Decide request scope**

Use the intake categories:

```text
palette-only | existing-persona-replacement | new-reserved-persona | standard-base-color
```

Expected decision examples:

```text
Vanger RGB change -> palette-only
New player "Name" with personal color -> new-reserved-persona
Change blue for every ordinary blue player -> standard-base-color
```

- [ ] **Step 3: Decide whether ELO aliases are in scope**

If the request changes names/aliases/canonical player identity, ELO aliases are in scope.
If it only changes CSS color values, ELO aliases are not in scope.

---

## Task 2: Write Or Update The Style Regression First

**Files:**
- Modify: `tests/Style.spec.ts`

- [ ] **Step 1: Add or update the persona/style expectation**

For a palette-only change, update the existing test for that color. Example for a `vanger` RGB change:

```ts
it('uses a reserved pure green treatment for the Vanger persona', () => {
  const variables = read('src/styles/variables.less');
  const common = read('src/styles/common.less');
  const board = read('src/styles/board.less');
  const playerHome = read('src/styles/player_home.less');
  const turmoil = read('src/styles/turmoil.less');
  const playerSymbol = read('src/client/utils/playerSymbol.ts');
  const vpChart = read('src/client/components/gameend/VictoryPointChart.vue');

  expect(variables).to.contain('@player_vanger: rgb(0, 255, 0);');
  expect(common).to.contain('.player_bg_color_vanger');
  expect(board).to.contain('.board-cube--vanger');
  expect(board).to.contain('content: "✳"');
  expect(playerHome).to.contain('&.colonies-fleet-vanger');
  expect(turmoil).to.contain('&.vanger');
  expect(playerSymbol).to.contain("vanger: '✳'");
  expect(vpChart).to.contain("['vanger']: 'rgb(0, 255, 0)'");
});
```

For a new reserved persona, add a new focused test with the same structure. Keep it about one persona.

- [ ] **Step 2: Run the focused test and confirm it fails for a new/change request**

Run:

```powershell
npx mocha --import=tsx --require tests/testing/setup.ts tests/Style.spec.ts --grep "Vanger"
```

Expected before implementation:

```text
1 failing
```

If this is a tiny follow-up to an already implemented change, it may already pass. In that case, verify the assertion still covers the new requirement.

---

## Task 3: Update Identity And Aliases When Needed

**Files:**
- Modify when needed: `src/common/Color.ts`
- Modify when needed: `elo/player_name_aliases.json`
- Modify when needed: `src/server/TelegramBot.ts`

- [ ] **Step 1: Add constants and color union entries for a new reserved persona**

Use this pattern in `src/common/Color.ts`:

```ts
export const EXAMPLE_COLOR = 'example' as const;
export const EXAMPLE_NAME = 'Example';
```

Add the color to `RESERVED_PLAYER_COLORS`:

```ts
export const RESERVED_PLAYER_COLORS = [
  // existing values...
  EXAMPLE_COLOR,
] as const;
```

Add the locked identity:

```ts
{
  color: EXAMPLE_COLOR,
  name: EXAMPLE_NAME,
  colorLabel: 'цвет словами',
  shortLabel: 'Ex',
  title: 'Example - reserved <color name>',
  aliases: ['example', 'пример'],
},
```

For palette-only requests, do not change `Color.ts` unless label/aliases/slug changed.

- [ ] **Step 2: Update ELO aliases when identity changes**

In `elo/player_name_aliases.json`, add lowercase aliases only:

```json
"example": "Example",
"пример": "Example",
"example surname": "Example"
```

Do not manually edit mutable `elo/elo-data.json` or live ELO data.

- [ ] **Step 3: Add Telegram color label**

In `src/server/TelegramBot.ts`, add:

```ts
example: 'цвет словами',
```

- [ ] **Step 4: Validate ELO alias migration dry-run**

Run:

```powershell
python elo/migrate_elo_nicknames.py --dry-run
```

Expected for alias-only additions without existing data rename:

```json
{
  "changedPlayers": 0,
  "changedResults": 0
}
```

If it reports real changes, stop and decide whether to run the migration deliberately before deploy.

---

## Task 4: Update Core Visual Tokens

**Files:**
- Modify: `src/styles/variables.less`
- Modify: `src/styles/mixins.less`

- [ ] **Step 1: Set the base RGB and helper colors**

In `src/styles/variables.less`, add or update:

```less
@player_example: rgb(0, 255, 0);
@player_example_light: #d9ffd9;
@player_example_dark: #004d00;
```

Only add `_light` and `_dark` if token gradients or create-game form need them.

- [ ] **Step 2: Set token gradient and sprite filters**

Add/update:

```less
@player_example_token_gradient: linear-gradient(135deg, @player_example_light 0%, @player_example 52%, @player_example_dark 100%);
@player_example_sprite_filter: saturate(1.55) brightness(1.48) contrast(1.12);
@player_example_fleet_filter: saturate(1.55) brightness(1.60) contrast(1.10);
@player_example_delegate_filter: saturate(1.55) brightness(1.48) contrast(1.12);
```

If an existing standard sprite color is close enough, reuse that sprite position and tune only the CSS filter.

- [ ] **Step 3: Add translucent mixin**

In `src/styles/mixins.less`, add:

```less
.player_example_bg_translucent() {
    .player_persona_bg_translucent(@player_example);
}
```

For standard base colors, use the existing simple rgba pattern instead of the persona helper.

---

## Task 5: Update Main UI Surfaces

**Files:**
- Modify: `src/styles/common.less`
- Modify: `src/styles/create_game_form.less`
- Modify: `src/styles/player_home.less`

- [ ] **Step 1: Add solid and translucent background classes**

In `src/styles/common.less`:

```less
.player_bg_color_example {
    background-color: @player_example;
    color: #001f00;
}

.player_translucent_bg_color_example {
    .player_example_bg_translucent();
    color: #001f00;
}
```

- [ ] **Step 2: Add readable text overrides**

For dark colors:

```less
.player_bg_color_example.log-player,
.player_translucent_bg_color_example .player-info-name,
.player_translucent_bg_color_example .player_name,
.player_translucent_bg_color_example .game-end-name-and-elo,
.player_translucent_bg_color_example .game-end-name-and-elo a,
.player_translucent_bg_color_example .player-name {
    color: #fff2f5;
}
```

For light colors:

```less
.player_bg_color_example.log-player,
.player_translucent_bg_color_example .player-info-name,
.player_translucent_bg_color_example .player-info-corp,
.player_translucent_bg_color_example td,
.player_translucent_bg_color_example .game-end-name-and-elo,
.player_translucent_bg_color_example .game-end-name-and-elo a {
    text-shadow: none;
}
```

If only one surface is wrong, scope the override to that surface instead of repainting all text.

- [ ] **Step 3: Add create-game form preview**

In `src/styles/create_game_form.less`:

```less
.player_translucent_bg_color_example {
    .create-game-player-field-theme(#001f00, @player_example);
}
```

Use a foreground color that is readable on the preview field.

- [ ] **Step 4: Add player-home surfaces**

In `src/styles/player_home.less`, add/update:

```less
.player_shadow_color_example {
    text-shadow: -1px -1px 6px @player_example, 1px 1px 1px #333a;
}

.grid-item.player_tag_bg_color_example {
    background-color: rgba(0, 255, 0, 0.24);
}
```

If milestone/award text needs a special color, update the `.ma-score.player_bg_color_<slug>` group.

---

## Task 6: Update Board Cubes, Colonies, And Turmoil

**Files:**
- Modify: `src/styles/board.less`
- Modify: `src/styles/player_home.less`
- Modify: `src/styles/turmoil.less`

- [ ] **Step 1: Add board cube sprite/filter**

In `src/styles/board.less`:

```less
.board-cube--example {
    background: url(./assets/board_icons.png) -72px -91px no-repeat;
    filter: @player_example_sprite_filter drop-shadow(2px 2px 3px black);
}
```

Pick the sprite position from the closest existing color shape. Do not invent new bitmap assets unless the request explicitly needs it.

- [ ] **Step 2: Add persona token gradient**

In `src/styles/board.less`:

```less
.board-cube--example.board-cube--persona::before {
    background: @player_example_token_gradient;
}
```

- [ ] **Step 3: Add overlay symbol**

In `src/styles/board.less`, add/update:

```less
.board-cube--example.overlay::after {
    content: "✳";
}
```

Keep the glyph aligned with `src/client/utils/playerSymbol.ts`.

- [ ] **Step 4: Add colony fleet**

In `src/styles/player_home.less` under `.colonies-fleet` variants:

```less
&.colonies-fleet-example {
    background-position: -70px 0;
    filter: @player_example_fleet_filter;
}
```

- [ ] **Step 5: Add Turmoil delegate token**

In `src/styles/turmoil.less`:

```less
&.example {
    .player-token-sprite(-865px, -35px, @player_example_delegate_filter);
}
```

If the delegate number becomes unreadable, add scoped `color` only inside that slug block.

---

## Task 7: Update UI Metadata

**Files:**
- Modify: `src/client/utils/playerSymbol.ts`
- Modify: `src/client/components/gameend/VictoryPointChart.vue`
- Modify when needed: `src/client/components/overview/PlayerEloBadge.vue`

- [ ] **Step 1: Add symbol overlay**

In `src/client/utils/playerSymbol.ts`:

```ts
example: '✳',
```

- [ ] **Step 2: Add game-end chart color**

In `src/client/components/gameend/VictoryPointChart.vue`, add/update:

```ts
['example']: 'rgb(0, 255, 0)',
```

- [ ] **Step 3: Add ELO badge style only if needed**

In `src/client/components/overview/PlayerEloBadge.vue`, add:

```css
.player-elo-badge--example {
  color: #d9ffd9;
  border-color: #00ff00;
  background: rgba(26, 26, 46, 0.78);
  box-shadow: 0 0 7px rgba(0, 255, 0, 0.32);
}
```

Skip this if generic ELO color is acceptable.

---

## Task 8: Validate Locally

**Files:**
- No new files unless tests need updates.

- [ ] **Step 1: Run targeted style test**

Run:

```powershell
npx mocha --import=tsx --require tests/testing/setup.ts tests/Style.spec.ts --grep "Example"
```

Expected:

```text
1 passing
```

- [ ] **Step 2: Compile CSS**

Run:

```powershell
npm run make:css
```

Expected:

```text
lessc src/styles/common.less build/styles.css
```

No Less errors.

- [ ] **Step 3: Run full build before staging/prod**

Run:

```powershell
npm run build
```

Expected:

```text
webpack ... compiled with 0-2 warnings
```

The existing bundle-size warnings are acceptable. TypeScript or Less failures are not.

- [ ] **Step 4: Check generated build cache-bust hash for release artifact**

Run:

```powershell
Get-FileHash -Algorithm MD5 build\main.js | Select-Object -ExpandProperty Hash
```

Use the first 8 lowercase hex chars as the staging/prod `main.js?v=<hash>` value when packaging a dirty test artifact.

---

## Task 9: Test On Staging

**Files:**
- Read: `scripts/README-staging.md`
- Use: `scripts/deploy_tm_staging.ps1`

- [ ] **Step 1: Deploy to staging**

For normal clean release source:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\deploy_tm_staging.ps1
```

For a deliberate dirty UI preview from the primary working tree:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\deploy_tm_staging.ps1 `
  -SourceRoot C:\Users\Ruslan\tm\terraforming-mars `
  -AllowPrimaryWorkingTree `
  -AllowDirtySource
```

Expected:

```text
Deploy ok
Staging verify OK
```

- [ ] **Step 2: Create or reuse a visual test game**

Use staging only:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\smoke_tm_staging.ps1
```

If the request needs multiple custom colors in one game, create a disposable staging game with those player colors and share the `game?id=...` URL.

- [ ] **Step 3: Manually inspect the surfaces**

Open:

```text
https://staging.tm.knightbyte.win/game?id=<gameId>
https://staging.tm.knightbyte.win/player?id=<playerId>
https://staging.tm.knightbyte.win/spectator?id=<spectatorId>
```

Check:

```text
overview row
resource stock counters
resource production counters
tag/action counters
player names and corp text
milestone/award scores
board cubes and overlay symbol
colony fleet
Turmoil delegate
ELO badge
game-end VP chart if available
```

---

## Task 10: Commit And Release

**Files:**
- Stage only source/test files touched by the color request.
- Do not commit local generated `assets/elo/*.json`.
- Do not commit `assets/index.html` cache-bust unless this is an intentional release-source commit.

- [ ] **Step 1: Review final diff**

Run:

```powershell
git diff --stat
git diff -- src/common/Color.ts src/styles tests elo src/client src/server
```

Expected: only the color request and its tests.

- [ ] **Step 2: Run safety checks**

Run:

```powershell
git diff --check
python elo/migrate_elo_nicknames.py --dry-run
npm run build
```

Expected:

```text
git diff --check: no output except line-ending warnings
ELO dry-run: changedPlayers 0 unless migration is intentional
build: success
```

- [ ] **Step 3: Commit**

Run:

```powershell
git add src/common/Color.ts elo/player_name_aliases.json src/server/TelegramBot.ts src/styles/variables.less src/styles/mixins.less src/styles/common.less src/styles/create_game_form.less src/styles/board.less src/styles/player_home.less src/styles/turmoil.less src/client/utils/playerSymbol.ts src/client/components/gameend/VictoryPointChart.vue src/client/components/overview/PlayerEloBadge.vue tests/Style.spec.ts
git commit -m "Update player color treatment"
```

If some files were not touched, `git add` will skip them or report pathspec only if the path is wrong. Prefer explicit staging over `git add .`.

- [ ] **Step 4: Push and deploy**

For staging-first release:

```powershell
git push origin HEAD:main
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\deploy_tm_staging.ps1
```

After user approves staging:

```powershell
pwsh -File C:\Users\Ruslan\tm\terraforming-mars\scripts\promote_tm_staging_to_prod.ps1
```

Do not deploy directly to prod unless Руслан explicitly says it is an emergency prod deploy.

---

## Future Refactor: Reduce Color Scatter

This is not required for a single color request, but it becomes valuable if color requests keep coming.

### Task A: Introduce A Single Color Catalog

**Files:**
- Create: `src/common/playerColorCatalog.ts`
- Create: `tools/colors/generate-player-color-less.ts`
- Modify: `src/common/Color.ts`
- Modify: `src/styles/variables.less`
- Modify: `tests/Style.spec.ts`

- [ ] **Step 1: Create a typed catalog**

Create `src/common/playerColorCatalog.ts` with one entry per reserved persona:

```ts
export type ReservedPlayerColorSpec = {
  slug: string;
  name: string;
  colorLabel: string;
  shortLabel: string;
  title: string;
  aliases: ReadonlyArray<string>;
  rgb: [number, number, number];
  textColor: string;
  symbol: string;
  tokenGradient: string;
  spriteFilter: string;
  fleetFilter?: string;
  delegateFilter?: string;
};
```

- [ ] **Step 2: Generate repeated Less snippets**

Create `tools/colors/generate-player-color-less.ts` that emits generated Less blocks for:

```text
variables
common background classes
board cube/persona classes
fleet classes
turmoil delegate classes
```

Do not replace all hand-written CSS in one giant PR. Start with variables and one low-risk surface.

- [ ] **Step 3: Add a consistency test**

In `tests/Style.spec.ts`, add a test that each reserved color has:

```text
Color.ts identity
variables.less base color
common.less background class
board.less cube class
player_home.less colony fleet class
turmoil.less delegate class
playerSymbol.ts symbol
VictoryPointChart.vue color
```

This catches incomplete future color requests.

---

## Self-Review

- Spec coverage: The plan covers palette-only changes, existing persona replacement, new reserved personas, ELO aliases, visual surfaces, tests, staging, and prod release.
- Placeholder scan: No placeholder steps remain; each code-touching task names files and gives concrete snippets.
- Type consistency: The example slug is consistently `example`; real requests should replace it with the actual color slug such as `vanger`, `pearl`, or `saturnstorm`.
