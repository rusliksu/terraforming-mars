# Wrybit AI spike (2026-10-23)

Branch: `codex/wrybit-ai-spike`, based on `origin/main` (5c27d5547).
Source: https://github.com/wrybit/terraforming-mars (GPL-3.0), commit 4b69f73.

## Scope

Port **only the server-side AI opponent** from the wrybit fork, then add the smallest playable
surface on this fork: an AI switch per seat in the create-game form and an "AI games are unrated"
policy. No client redesign, no analysis-game rating UI, no card/board content.

## What was copied

| Path | Content |
|---|---|
| `src/common/ai/` | AI level type/names, supported-settings matrix, decision summary type |
| `src/server/ai/` | 91 files: driver, decision engine, valuation, BGA priors and measured data (9.9 MB JSON) |
| `src/server/logs/aiDecisionContext.ts` | attaches log lines to the AI decision that produced them |
| `tests/ai/` | 52 spec files and the random-game harness |

Dropped on purpose: `src/server/aiFeedback/` (rating UI/API) and every client redesign.

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

## Create-game UI and ELO policy

- Every seat row has an **AI** switch next to the other seat options. Turning it on reveals a level
  picker (easy / normal / hard), clears the Telegram bot flag, and fills an empty name with `AI N`.
- The shared validation (`validateNewGameConfig`) blocks two cases before the request is sent:
  - every seat is an AI ("At least one human player is required");
  - the selected expansions/modes are outside the AI support matrix (the same list the server
    enforces, so the form and the API cannot disagree).
- **AI games are always training games.** The form forces `noEloGame` and disables the checkbox
  with a hint, the payload also sends `noEloGame: true`, and `ApiCreateGame` enforces it again
  for API callers. ELO against the computer must never be farmable.
- AI seats are exempt from the async-game Telegram id requirement; they are driven by the server.

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

- `npm run build:server`, `npm run build:tests`, `npm run lint:client` and `npm run build`
  (webpack, 28 s) all pass.
- AI suite: **140 passing, 1 pending, 0 failing** (the pending one is the skipped coordinate test).
- Create-game client tests: **93 passing** (CreateGameForm, fanmade form, JSON import, validation
  popup), including three new AI cases: serialized AI seat + forced training game, all-AI table
  blocked, and the AI toggle itself. Validation suite: **14 passing**.
- Runtime check: game created through `POST api/creategame` with one AI seat and **no**
  `noEloGame` in the body; the saved game has `noEloGame: true` and `aiLevel: "normal"` on the
  seat.
- Live demo on a local server (port 8099, isolated SQLite): two AI seats, base + Corporate Era.
  The game left research, played cards, standard projects and actions, passed each generation and
  **finished (phase=end) in generation 14 with 459 log entries**.
- Bounded harness game: 382 decisions, 19 generations, `finished: true`, result 196:40.

## Known gaps

- In-game presentation is minimal: the `[AI]` name marker only, no level badge or "thinking" hint.
- `aiAnalysis` feedback UI (rating AI decisions) was not ported; the option and log fields exist.
- Coordinate labels: one test is skipped and `spaceName()` returns the space id.
- AI support matrix is base / Corporate Era / promo / Venus / Prelude / Prelude 2 only.
  Colonies, Turmoil, Moon, Pathfinders, CEOs, Star Wars, Underworld, Delta and the fan modules are
  rejected at create time (now also in the form).
- All-AI games still require the admin server id through the API; the form blocks them on purpose.

## Next steps

1. Deploy to staging and play a few real games with one AI seat; watch the driver logs for stuck
   prompts (the loop class of bugs above).
2. Optional: a level badge in the game log/player list and a "host is thinking" indicator.
3. Optional: analysis games (public AI log + rating) once the base feature is stable.
