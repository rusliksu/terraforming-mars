# Player color preferences

## Problem

The create-game form stores one preferred color per saved player profile. If that color is occupied, it falls back to the first free standard color, but it does not remember ranked alternatives or automatically promote a player when a better preference becomes free. The palette also allows duplicate selections until submit time and hides a saved player's reserved color after the player switches to a standard color.

## Goals

- Keep an ordered list of color preferences per saved player profile while preserving the existing `preferredColor` API.
- Assign the first available preference, then fall back to a free standard color.
- Never allow the create-game UI to select a color already used by another visible player.
- When an automatically assigned player preference becomes free, promote that player to the best available preference.
- Let a saved player with a reserved color switch to a standard color and back to their reserved color without losing the selected profile.
- Add `Никита` as a distinct profile from `Nuke` and `Никитос`, with orange as the known primary preference; keep surname/underscore forms as aliases.

## Non-goals

- Do not change colors in an active game. Player colors are gameplay identity keys and a mid-game color migration has a much larger blast radius.
- Do not merge `Никитос` or `Nuke` into `Никита`.
- Do not deploy or restart production as part of this slice.
- Do not invent second or third personal preferences where they are not known yet.

## Current ownership

- Canonical ELO aliases: `elo/player_name_aliases.json`.
- Saved profile metadata and preferred colors: `src/common/PlayerProfiles.ts`.
- Standard and reserved color identities: `src/common/Color.ts`.
- Create-game palette and assignment behavior: `src/client/components/create/CreateGameForm.vue`.
- Validation: `tests/PlayerProfiles.spec.ts`, `tests/client/utils/Elo.spec.ts`, and `tests/client/components/create/CreateGameForm.spec.ts`.

## Target contract

- `PlayerProfile.preferredColor` remains the primary color for compatibility.
- `PlayerProfile.preferredColors` is optional and ordered. A helper returns a unique ordered list beginning with `preferredColor`.
- Create-game automatic assignments may be promoted when preferences become free.
- Manual palette choices are sticky and are not changed by automatic promotion.
- A player's palette is the standard palette plus that selected profile's non-standard preferences.

## Phases

- [x] Phase 1: canonicalize `Никита_Кусков` as `Никита` and add the saved profile.
- [x] Phase 2: add the compatible ordered-preference contract and focused unit tests.
- [x] Phase 3: enforce immediate palette uniqueness, manual-choice stickiness, automatic promotion, and reserved-color round trips.
- [x] Phase 4: run targeted tests, TypeScript checks, and ELO migration dry-run.
- [x] Phase 5: apply the backed-up ELO canonicalization and install a game-specific attribution override. The active-game display rename remains gated because it requires a database mutation plus production restart.

## Rollout and rollback

- The code slice is local until reviewed and explicitly approved for staging/prod deployment.
- The profile contract is additive; rollback is a normal revert of the slice.
- Live ELO regeneration must snapshot current ELO artifacts first and verify that surname/underscore forms and the corrected game resolve to `Никита`, without changing `Nuke`.
- The active game's player name may be corrected only with a narrow verified mutation; its current color remains unchanged.

## Open decisions

- Collect real second and third preferences per player instead of guessing them.
- Occupied colors are disabled rather than swapping players implicitly.
