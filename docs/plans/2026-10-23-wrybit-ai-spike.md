# Wrybit AI spike (2026-10-23)

Branch: `codex/wrybit-ai-spike`, based on `origin/main` (5c27d5547).
Source: https://github.com/wrybit/terraforming-mars (GPL-3.0), commit 4b69f73.

## Scope

Port **only the server-side AI opponent** from the wrybit fork. No client redesign, no
analysis-game UI, no card/board content: those live in the same fork but are separate projects.

The goal was to learn how much of the AI survives contact with this fork's 989 custom commits
(ELO, simulation host, surrender/bot takeover, Telegram, fanmade modules, custom options).

## What was copied

| Path | Content |
|---|---|
| `src/common/ai/` | AI level type/names, supported-settings matrix, decision summary type |
| `src/server/ai/` | 91 files: driver, decision engine, valuation, BGA priors and measured data (9.9 MB JSON) |
| `src/server/logs/aiDecisionContext.ts` | attaches log lines to the AI decision that produced them |
| `tests/ai/` | 52 spec files and the random-game harness |

Dropped on purpose: `src/server/aiFeedback/` (rating UI/API) and every client change.

## Integration points

- `IPlayer.aiLevel` / `Player.aiLevel`, serialized in `SerializedPlayer` so AI seats survive restarts.
- `Player.setWaitingFor` notifies the driver through `ai/aiHook` (no import cycle).
- `globalInitialize()` calls `installAiDriver()`.
- `GameOptions.aiAnalysis` (default false), `NewGameConfig.aiLevel` per seat and `aiAnalysis`.
- `ApiCreateGame`: accepts `aiLevel`, names the seat `<name> [AI]`, rejects settings the AI cannot
  handle (`aiSupport.ts`) and enables `aiAnalysis` only when an AI seat exists.
- `ServerModel` / client models expose `aiLevel` and hide `waitingFor` of AI seats.
- `ApiWaitingFor` does not wait on AI seats; `PlayerInput` rejects human moves for AI seats.
- Compatibility shims: optional `IMilestone.thresholdFor` (BaseMilestone returns its threshold),
  `IGame.aiDecisionCount`, log ids/decision fields on `LogMessage`, `spaceName()` falls back to the
  space id because this fork's boards do not carry the upstream `A9` coordinate tables yet.

## Fork-specific problems found by the spike

1. **End Turn loop.** This fork adds an `End Turn` action (variable actions per turn, idesOfMars
   Administrative Delay). The AI picked it instead of passing, so a generation with two broke
   players never ended: the demo game produced ~40 "ended turn" lines and no generation change.
   Fix: `End Turn` is not offered to AI seats - they pass like any player without actions.
2. **Surrender confirmation loop.** The custom surrender prompt ("A bot will continue playing for
   you") was offered in the action menu; the AI answered it, returned to the menu and was asked
   again, thousands of times per second. Fix: surrender is a human-only option.
3. **Undo menu option** is likewise human-only now.
4. **Milestone race valuation was dead.** The AI asks milestones for `thresholdFor(game)`; this
   fork only had the optional interface member and no implementation, so every milestone was
   skipped and the valuation returned 0. Fixed by making `BaseMilestone.thresholdFor` return its
   threshold; `milestoneRace` and `sellToAfford` specs pass again.
5. **Test harness seats were human.** `playRandomGame` created players without `aiLevel`, so the
   harness saw human-only menu entries (surrender/end turn) and looped in generation 1. The
   harness now marks its seats as AI, matching production.

## Verification

- `npm run build:server` and `npm run build:tests` pass.
- AI suite: **140 passing, 1 pending, 0 failing** (the pending one is the skipped coordinate test).
- Live demo on a local server (port 8099, isolated SQLite): game with two AI seats,
  base + Corporate Era. It left the research phase, played cards, standard projects and actions,
  passed each generation and **finished (phase=end) in generation 14 with 459 log entries**.
- Bounded harness game: 382 decisions, 19 generations, `finished: true`, result 196:40
  (AI versus a random seat).
- API-only creation: the create-game form has no AI controls yet, so the smoke used
  `POST api/creategame` with `players[i].aiLevel` and `serverId` (all-AI games need the server id).

## Known gaps

- No create-game UI: AI seats can only be created through the API for now.
- `aiAnalysis` feedback UI (rating AI decisions) was not ported; the option and log fields exist.
- Coordinate labels: one test is skipped and `spaceName()` returns the space id (readable, but not
  the printed map coordinate).
- AI support matrix is base / Corporate Era / promo / Venus / Prelude / Prelude 2 only.
  Colonies, Turmoil, Moon, Pathfinders, CEOs, Star Wars, Underworld, Delta and the fan modules
  are rejected at create time.
- AI games still count for ELO unless the creator passes `noEloGame`; decide the policy before
  exposing the feature.
- The client shows the `[AI]` name marker only; there is no level badge or AI settings panel.

## Next steps

1. Create-game UI: an "AI" toggle per seat and a level picker, reusing the API contract above.
2. Decide ELO policy for AI games and set `noEloGame` server-side when any AI seat is present
   (or keep it opt-in and tag such games in stats).
3. Optional: analysis games (public AI log + rating) once the base feature is stable.
