# Research: Finish After Last Active Player

## Decision: Reuse the existing surrender transaction

**Decision**: Add the early-finish check after surrender persistence and before
`BotTakeoverManager.start`.

**Rationale**: `SurrenderService` already owns validation, snapshot/rollback,
save ordering, and bot takeover. Keeping the new transition there avoids a
second API-only implementation and prevents a bot from being started after a
finished result.

**Alternatives considered**: Calling the check from `ApiSurrender` would miss
the authenticated player-input route; changing action progression would make
the rule depend on turn navigation rather than the explicit surrender event.

## Decision: Extend the shared completion-rank value object

**Decision**: Carry an optional shared-remaining-places flag through
`CompletionRank` and use it in game-result and ELO ranking. Persist the visible
range `2–N` separately from its midpoint `(N+2)/2`.

**Rationale**: Game results and ELO currently share the outcome/VP/megacredit
ordering helper. A single marker keeps normal tie-breaking unchanged, ensures
stored-result rebuilds cannot accidentally restore surrendered players above
the surviving player, and makes every surrenderer a pairwise draw against the
other surrenderers.

**Alternatives considered**: Subtracting VP or mutating player state would
break raw scoring and VP-based ELO. Storing only the total-player-count place
would overstate the placement-stat penalty. Storing only a fractional place
would make the visible result unclear, so range and midpoint remain distinct.

## Decision: Keep the existing completion outcome vocabulary

**Decision**: Record explicit surrender as `surrendered` and do not add a new
outcome or schema field.

**Rationale**: Existing reliability metrics and stored summaries already
distinguish `completed`, `surrendered`, and `left`; the requested penalty is a
place/rating result, not a new lifecycle category.

**Alternatives considered**: A `finished-by-surrender` outcome would require
schema and analytics migration without adding information needed by the rule.

## Decision: Make finalization await completion

**Decision**: Await `GameLoader.completeGame` from `gotoEndGame`.

**Rationale**: The surrender request should not return a partially finished
game while the result and ELO write are still in flight. Existing callers can
continue to invoke the async method without changing the normal gameplay
entrypoint.

**Alternatives considered**: Keeping fire-and-forget would leave a race where a
retry could start a bot or observe `ACTION` after the final surrender.
