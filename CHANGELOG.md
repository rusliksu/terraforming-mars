# Changelog

All notable changes to the custom Terraforming Mars server are recorded here.

## [Unreleased] - Wrybit interface pass

### Added

- In-game **Player help → Interface & Controls** tab with layout, keyboard and mobile guidance.
- [Wrybit interface guide](docs/wrybit-ui-guide.md) with desktop/mobile screenshots taken without the advisor extension.

### Changed

- Player view now keeps the board, players and action panel in one viewport at desktop widths; no page scrolling, panels scroll inside.
- Player table rows and resource/tag icons are larger and easier to scan.
- Narrow player table keeps VP/TR/cards/actions plus compact goods and played-tag strips instead of showing only resource numbers; the timer stays visible next to a passed status.
- Reserved player fleets use a coloured hull instead of the neutral grey shuttle; the bottom Fleets area lists only ships that have not launched.
- Player-table rows for light reserved identities (pearl, gold, saturn ...) switch the text inside the row to the persona's classic dark tone, so the white counters and the muted corporation name no longer disappear on the light surface.
- Removed the alarming "Not enough space" tooltip from the player table toggles.
- Basic ocean, city and greenery tiles use the classic Terraforming Mars tile art instead of tiny sprite glyphs.
- Finished-game victory-point/global-parameter charts use reserved player colours instead of the grey fallback.
- The winner total in the results table uses a dark fallback on the gold surface, and the Rigatone persona pattern no longer crosses the score cells.
- Non-winner total cells have a stronger dark backdrop, keeping the gold score readable on bright reserved-colour rows.
- Spectator log updates no longer remount the game view on every poll; new lines fade in in place, preserving scroll and selection.
- Spectator polling now applies a new model only when the game actually changed; unchanged responses no longer repaint the board, table and log every second. The live benchmark stayed at 60 FPS (p99 frame 16.9 ms) with only three initial long tasks instead of periodic 100–130 ms spikes.
- Spectator pages no longer create vertical page scroll; the fixed one-screen shell now covers both player and spectator views.
- Colonies are rendered as the familiar classic colony cards in a two-column card grid, with the compact fleet hangar below.
- Keyboard-shortcut caps are larger in game buttons/tabs and in the interface help.
- Mobile player header no longer shows the legal footer over the menu, and the desktop layout switch is hidden on phones.

## [2026-10-29] - Production UI release

### Fixed

- Restored missing Conglomerates milestone artwork (colonizer6.png, spacefarer9.png) that caused 404s on the cards page.
- Fixed the Wrybit Commercial District tile asset path (commerical_district.png -> commercial_district.png).
- Contained the ELO ratings table and Stats section within the mobile viewport; wide tables now scroll inside their own container.
- Prevented the ELO page from producing page-level horizontal overflow on narrow screens.

### Changed

- Production artifacts now include README.md and CHANGELOG.md alongside the runtime files.

### Verified

- Production release: 87d94cb7fbbb11d5505a2f8c4ff1d9d728cfb61f
- Production artifact: 2f869af99972a59ac0c0dc82c177f3aab9f6a1cbc4f0f01a5acab4b131b7f1a0
- sourceTreeClean: true in production release.json.
- git status --short: clean.
- tests/Style.spec.ts: 32 passing.
