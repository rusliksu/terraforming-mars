# Data Model: Finish After Last Active Player

## Game lifecycle state

- `Game.players`: all players in the game; its length defines the upper bound
  of the surrendered players' shared range.
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
- `shareRemainingPlaces` (optional): true only for surrendered players when the
  trigger invariant holds.

Normal ordering remains outcome priority, VP descending, then megacredits
descending. Shared-remaining-place entries compare after the sole completed
winner and tie with one another regardless of VP or megacredits.

## Persisted score/result

- `Score.playerScore` and `Score.victoryPointsBreakdown` remain the player's
  raw values.
- `Score.place` is `1` for the sole non-surrendered player and `(N+2)/2` for
  every surrendered player.
- `Score.placeFrom` and `Score.placeTo` persist the visible shared range `2–N`.
- ELO stored results carry the same range and effective place. Equal effective
  places are pairwise draws; VP-based comparisons continue to use raw `vp`.
- Surrender remains distinct from a technical `left`: it loses place-ELO but
  does not add a leave-reliability strike or achievement credit.

## State transitions

```text
ACTION + accepted surrender
  -> persist surrenderedPlayerIds
  -> if exactly one non-surrendered player: finalize and persist END result
  -> otherwise: start/reuse surrender takeover bot and remain ACTION
```

`END` is terminal for surrender validation and early-finalization retries.
