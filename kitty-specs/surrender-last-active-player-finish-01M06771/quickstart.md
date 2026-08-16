# Quickstart: Finish After Last Active Player

## Local verification

From the repository root `C:\Users\Ruslan\.codex-worktrees\terraforming-mars-tm-surrender-last-player-finish-repo`:

1. Run focused tests for `tests/Game.spec.ts`,
   `tests/routes/ApiSurrender.spec.ts`, and
   `tests/server/EloSyncService.spec.ts` using the repository's normal test
   build/runner.
2. Run `npm run build:tests`.
3. Run `npm run lint:server` and `npm run build:server`.
4. Run the full repository build and `git diff --check`.

## Expected behavior

- In a 2-player action-phase fixture, one accepted surrender finishes the game,
  records the other player as place 1, and does not start a bot.
- In a 3-player fixture, two surrendered players both receive place 3 even if
  their raw VP differs from the winner or each other.
- With at least two non-surrendered players, surrender remains the existing bot
  takeover path.
- No command in this quickstart touches production or live game data.
