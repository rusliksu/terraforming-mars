# Quickstart: Finish After Last Active Player

## Local verification

From the repository root `C:\Users\Ruslan\.codex-worktrees\terraforming-mars-tm-surrender-last-player-finish-repo`:

1. Run focused tests for `tests/Game.spec.ts`,
   `tests/routes/ApiSurrender.spec.ts`, and
   `tests/server/EloSyncService.spec.ts`, plus the GameEnd and legacy ELO tests,
   using the repository's normal test runners.
2. Run `npm run build:tests`.
3. Run `npm run lint:server`, `npm run lint:client`, `npm run build:server`, and
   `npm run build:client`.
4. Run `python elo/test_tm_stats.py`, the full server/client suites, and
   `git diff --check`.

## Expected behavior

- In a 2-player action-phase fixture, one accepted surrender finishes the game,
  records the other player as place 1, and does not start a bot.
- In a 3-player fixture, two surrendered players display range 2–3 and both
  receive effective place 2.5 even if their raw VP differs.
- Place-ELO treats surrenderers as losing to the winner and tied with each
  other; raw VP, VP-ELO, and leave reliability remain unchanged.
- With at least two non-surrendered players, surrender remains the existing bot
  takeover path.
- No command in this quickstart touches production or live game data.
