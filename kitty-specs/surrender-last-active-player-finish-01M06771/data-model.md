# Data Model: Finish After Last Active Player

## Game lifecycle state

- `Game.players`: all players in the game; its length is the final place used
  for forced-last surrenderers.
- `Game.surrenderedPlayerIds`: explicit surrender membership persisted in the
  serialized game.
- `Game.phase`: changes from `ACTION` to `END` exactly once for the early path.
- Trigger invariant: `players.length > 1` and
  `surrenderedPlayerIds.size === players.length - 1`.
- Fail-closed invariant: zero non-surrendered players never invents a winner.

## Completion rank

`CompletionRank` contains:

- `completionOutcome`: existing `completed`, `surrendered`, or `left` value.
- `vp`: raw calculated victory points.
- `megacredits`: raw final megacredits used by existing tie-breaks.
- `forceLastPlace` (optional): true only for surrendered players when the
  trigger invariant holds.

Normal ordering remains outcome priority, VP descending, then megacredits
descending. Forced-last entries compare after all non-forced entries and share
one place.

## Persisted score/result

- `Score.playerScore` and `Score.victoryPointsBreakdown` remain the player's
  raw values.
- `Score.place` is `1` for the sole non-surrendered player and the total player
  count for every forced-last surrendered player.
- ELO stored results carry the existing `completionOutcome` plus the computed
  place; VP-based comparisons continue to use `vp`.

## State transitions

```text
ACTION + accepted surrender
  -> persist surrenderedPlayerIds
  -> if exactly one non-surrendered player: finalize and persist END result
  -> otherwise: start/reuse surrender takeover bot and remain ACTION
```

`END` is terminal for surrender validation and early-finalization retries.
