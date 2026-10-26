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
player the shared range `2–N` plus effective place `(N+2)/2` in the
last-active-player scenario. Place-ELO records a loss against the sole winner
and a draw between surrenderers. VP-ELO and leave reliability remain unchanged;
surrenderers receive no win or top-three achievement credit.
