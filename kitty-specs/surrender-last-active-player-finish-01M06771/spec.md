# Mission Specification: Finish After Last Active Player

**Mission Branch**: `codex/tm-surrender-last-player-finish`  
**Created**: 2026-08-17  
**Status**: Approved for implementation  
**Input**: Руслан подтвердил: если все игроки кроме одного явно сдались, партия завершается; несдавшийся игрок получает первое место, сдавшиеся совместно последнее место, raw VP не вычитаются, а place/ELO считается как последнее место.

## User Scenarios & Testing

### User Story 1 - Finish when one active player remains (Priority: P1)

As a player in a multiplayer game, I want the game to finish immediately after
all other players explicitly surrender, so that I am not forced to play an
empty game or wait for Mars to be terraformed.

**Why this priority**: This removes the blocking state created when surrendered
places are controlled only by takeover bots and one human is left.

**Independent Test**: In a 2-, 3-, and 4-player action-phase fixture, surrender
every player except one and observe the public game result without making
another action.

**Acceptance Scenarios**:

1. **Given** a multiplayer action-phase game with exactly one non-surrendered
   player, **When** the last other player confirms Surrender, **Then** the game
   enters its finished state and persists the result.
2. **Given** a two-player game, **When** one player confirms Surrender,
   **Then** the other player wins immediately and no extra bot turn is taken.

### User Story 2 - Rank surrendered players last (Priority: P1)

As a player viewing the result, I want every player who surrendered in the
last-active-player scenario to share the final place, so that surrender cannot
produce a better place than the remaining active player.

**Why this priority**: The result must reflect the explicit surrender outcome
and provide the corresponding place-based rating penalty.

**Independent Test**: Finish a three-player fixture with one completed player
and two surrendered players whose VP and megacredits differ; verify places and
completion outcomes in the stored result and ELO summary.

**Acceptance Scenarios**:

1. **Given** three players where one completed player remains and two players
   surrendered, **When** the game finishes, **Then** the completed player has
   place 1 and both surrendered players have place 3 with outcome
   `surrendered`.
2. **Given** surrendered players with higher raw VP than the winner, **When**
   the result is generated, **Then** their raw VP remains unchanged but their
   place-based rating uses the shared final place.

### User Story 3 - Preserve ordinary surrender and normal games (Priority: P2)

As a player in a game with at least two non-surrendered places remaining, I
want the existing surrender takeover and normal Mars-ending rules to continue
unchanged.

**Why this priority**: The early-finish rule must not alter ordinary turns,
bot takeover, production, or ranking scenarios outside its trigger.

**Independent Test**: Run fixtures with zero surrendered players and with one
surrendered player plus at least two non-surrendered players; verify that the
existing action loop and ordinary end-game path are used.

**Acceptance Scenarios**:

1. **Given** at least two non-surrendered players, **When** one player
   surrenders, **Then** the game does not finish solely because of that
   surrender and the surrendered place follows the existing takeover flow.
2. **Given** a game that ends through normal Mars/solo rules, **When** it has
   surrendered players but not the last-active-player condition, **Then** the
   existing outcome-group and VP/megacredit tie-break behavior remains.

### Edge Cases

- A solo game and a game with no surrendered players must never trigger this
  early-finish rule.
- A surrender request that would leave zero non-surrendered players must fail
  closed and must not invent a winner or write a partial result.
- Repeated surrender, automated-player surrender, and surrender outside the
  active action phase retain their existing validation errors.
- The finalization path must be idempotent: a retry or server restore cannot
  write duplicate game results or restart a surrendered bot after completion.
- The final result must preserve the surrendered outcome for reliability
  metrics; it must not convert explicit surrender into `left`/`abandoned`.

## Requirements

### Functional Requirements

| ID | Title | User Story | Priority | Status |
|----|-------|------------|----------|--------|
| FR-001 | Detect last active player | After an accepted explicit surrender, the game SHALL detect when exactly one player is not surrendered and SHALL invoke the existing game-finalization path. | P1 | Approved |
| FR-002 | Finish immediately | When FR-001 is true, the multiplayer game SHALL persist a finished result without waiting for Mars terraforming, another action, production, or a takeover-bot turn. | P1 | Approved |
| FR-003 | Shared final place | In the FR-001 result, the sole non-surrendered player SHALL receive place 1 and every surrendered player SHALL receive the same final place equal to the total player count. | P1 | Approved |
| FR-004 | Preserve raw VP | Finalization SHALL retain each player's calculated raw VP and VP breakdown; this feature SHALL NOT subtract VP directly from surrendered players. | P1 | Approved |
| FR-005 | Apply place rating penalty | Place-based rating calculations SHALL consume the final-place result for every surrendered player in FR-001, while VP-based rating inputs remain the recorded raw VP. | P1 | Approved |
| FR-006 | Preserve completion outcome | Every explicitly surrendered player SHALL be recorded as `surrendered`, not `left` or `abandoned`, in the game result and completion metrics. | P1 | Approved |
| FR-007 | Preserve non-triggering flows | If fewer than all but one players have surrendered, existing surrender takeover, action progression, and normal Mars/solo finalization SHALL remain unchanged. | P2 | Approved |
| FR-008 | Avoid duplicate finalization | A repeated callback, reload, or restore after this early finish SHALL NOT create duplicate game results or re-enter active play. | P1 | Approved |

### Non-Functional Requirements

| ID | Title | Requirement | Category | Priority | Status |
|----|-------|-------------|----------|----------|--------|
| NFR-001 | Fast completion | From the accepted last surrender, the public game result SHALL become available within 1 second in the focused local flow test. | Performance | High | Approved |
| NFR-002 | Persistence safety | The focused early-finish, ranking, and restore tests SHALL pass in three consecutive local runs without flaky failures. | Reliability | High | Approved |
| NFR-003 | Narrow regression coverage | The implementation SHALL include focused coverage for 2-, 3-, and at least one non-triggering multiplayer scenario. | Quality | High | Approved |

### Constraints

| ID | Title | Constraint | Category | Priority | Status |
|----|-------|------------|----------|----------|--------|
| C-001 | Explicit surrender only | Only the existing confirmed Surrender state can trigger this rule; inactivity, closed tabs, and automatic abandonment are out of scope. | Product | High | Approved |
| C-002 | Existing outcome vocabulary | Use the existing `completed`, `surrendered`, and `left` outcome model; do not add a second surrender or abandonment status. | Domain | High | Approved |
| C-003 | No direct VP penalty | “Lose points” means the place-based rating outcome; raw Terraforming Mars VP and its breakdown remain unchanged. | Scoring | High | Approved |
| C-004 | No live mutation | This mission changes code and tests only. Production games, production DB, manual ELO data, and live services are not changed by implementation or tests. | Operations | High | Approved |
| C-005 | PR delivery | Changes must remain on the task branch and be delivered through the repository PR workflow; deployment is a separate gate. | Delivery | High | Approved |

### Key Entities

- **Game**: Multiplayer lifecycle, active/surrendered player state, phase, and
  finalization trigger.
- **Player**: Raw VP, megacredits, and explicit surrender membership.
- **Completion outcome**: `completed`, `surrendered`, or `left`, used to rank
  results and reliability without treating surrender as a leave.
- **Score/rating result**: Persisted place, raw VP, and rating inputs produced
  when a game ends.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In 100% of focused 2-, 3-, and 4-player fixtures, the last
  accepted surrender leaves exactly one winner and finishes the game without a
  further player action.
- **SC-002**: In 100% of last-active-player fixtures, every surrendered player
  has outcome `surrendered` and place equal to the total player count.
- **SC-003**: In 100% of last-active-player fixtures, stored raw VP and VP
  breakdowns exactly match the values immediately before finalization.
- **SC-004**: In 100% of non-triggering fixtures, existing surrender takeover
  and normal Mars-ending behavior remain unchanged.
