# Surrender Finish Contract

## `POST /api/surrender?playerId=<playerId>`

The request and response envelope remain unchanged. On the final accepted
surrender, the response still returns the `surrenderedPlayers` array, but the
game is already in `END` and no takeover bot is started for the surrendered
player.

The access-audit metadata may use the internal value
`botTakeover: "skipped-game-finished"` to distinguish this successful path from
`"started"` and `"already-active"`. This is telemetry only; it does not change
the public response schema.

The persisted result records every explicit surrender as completion outcome
`surrendered`, preserves raw VP and its breakdown, and assigns each surrendered
player the total-player-count place in the last-active-player scenario.
