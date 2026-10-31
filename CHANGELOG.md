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
- Removed the alarming "Not enough space" tooltip from the player table toggles.
- Basic ocean, city and greenery tiles use the classic Terraforming Mars tile art instead of tiny sprite glyphs.
- Finished-game victory-point/global-parameter charts use reserved player colours instead of the grey fallback.
- Spectator log updates no longer remount the game view on every poll; new lines fade in in place, preserving scroll and selection.
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
