# Experimental step undo

Status: investigation and proof-of-concept. Do not deploy to production yet.

## User-visible model

There are two separate operations:

1. **Undo action** is the stable fallback. It restores the state before the
   current action (or the previous completed action) and is available from every
   active-player prompt, not only the main `Take action` screen. If the action
   revealed hidden information, the UI warns the player and requires explicit
   confirmation, but the server does not silently forbid the undo.
2. **Back one step (experimental)** removes only the latest accepted prompt
   response inside the current root action. It is shown only with experimental
   UI enabled. For Project Eden, placing the first city and then pressing Back
   returns to the city-placement screen, while keeping the earlier choice to
   play Project Eden and all earlier completed parts of that prelude.

The old extra confirmation screen for card selection is out of scope and must
not return.

## Current architecture

`WaitingFor.vue` sends one `InputResponse` to `player/input` for each submitted
screen. `Player.process` clears the current `waitingFor`, processes the input,
runs its callback, and drains enough deferred actions to produce the next
prompt. One accepted HTTP input therefore normally advances one visible screen,
although it can also execute several synchronous mutations and deferred effects.

Database saves have a different boundary. With undo enabled, `Player.takeAction`
saves at root action boundaries. Research, drafting, generation, and a few
special flows save explicitly. The game is not saved after every prompt.

`Game.serialize` intentionally omits `deferredActions`, `waitingFor`, and the
callback closures that continue a nested action. `Game.deserialize` reconstructs
phase/root prompts, not arbitrary intermediate prompts. Project Eden also keeps
its completed-part list in the live `ProjectEden.selected` field, which is not
serialized. Consequently, saving every screen is insufficient: loading such a
snapshot would not know how to continue the nested action.

The existing simulator already demonstrates the useful primitive: deserialize a
root snapshot, verify the prompt fingerprint, and feed accepted `InputResponse`s
through `Player.process` to recreate the same intermediate prompt.

## Proposed architecture

Keep a bounded **root-action input journal**:

```ts
type ActionInputEntry = {
  actorId: PlayerId;
  promptFingerprint: string;
  input: InputResponse;
};

type ActionReplayState = {
  rootSaveId: number;
  rootSnapshot: SerializedGame;
  entries: Array<ActionInputEntry>;
};
```

- Start or replace the journal at a restorable root prompt (normal action,
  prelude, CEO action, and other supported roots).
- After an input is validated and accepted, append it with the actor and the
  fingerprint of the prompt it answered. Rejected inputs are never appended.
- To go back one step, deserialize the root snapshot in replay mode and process
  all journal entries except the last one. Verify every prompt fingerprint
  before processing. The resulting live game should be at the preceding screen.
- Replace the cached game only after the entire replay succeeds and the resulting
  prompt matches the expected predecessor. On any mismatch, leave the live game
  untouched and offer full-action undo.
- Replay mode must suppress persistence, Telegram notices, audit duplication,
  and other external effects. The final restored live game receives one undo
  counter increment and canceled log annotations for mutations removed by the
  step.

This avoids serializing callbacks and avoids a reversible-command implementation
across hundreds of direct game mutations.

## Hidden-information rule

Step replay starts from the same serialized deck/RNG state and replays the same
earlier inputs, so already revealed cards should remain identical. Prompt
fingerprints and a successor-state check make divergence a hard failure instead
of allowing a reroll.

Undoing a choice made from an already visible card set is reversible without a
warning: for example, Hi-Tech Lab returns to the identical revealed set so the
player can choose a different card. Stepping back once more, past the input that
revealed cards from a draw or discard pile, crosses an irreversible boundary.
The server then requires explicit confirmation and appends a red public log
entry after the canceled action messages.

Full-action undo remains possible after hidden information is revealed, but only
after a clear warning. The server must record that the confirmed undo crossed a
hidden-information boundary. This warning is part of stable undo, not an extra
card-selection confirmation screen.

## Delivery slices

- [x] Add a pure replay helper and a focused Project Eden test proving that
      replaying all but the last input recreates the previous placement prompt.
- [x] Add replay mode that suppresses saves and notifications; test that a
      failed fingerprint does not mutate the live game.
- [x] Add the bounded runtime journal at root prompts and accepted input routing.
- [x] Expose server `canStepBack` capability in the player model. Stable undo
      visibility still uses the existing main-action prompt contract.
- [x] Make stable Undo action available on all supported active-player prompts.
- [x] Replace the hidden-information hard block with a structured
      confirmation-required response and an explicit confirmed request.
- [x] Show `Back one step (experimental)` only when `experimental_ui` is enabled
      and the server reports a replayable previous step.
- [x] Validate Project Eden tile placement, Hi-Tech Lab after final card choice,
      failed prompt fingerprints, and replay divergence.
- [ ] Validate payment, Charity Donation, multi-player actor changes, and server
      restart behavior.
- [ ] Deploy to staging only after the focused suite and full server suite pass.

## Initial limits

- The experimental journal may initially be runtime-only. After a server restart,
  `Back one step` disappears and stable full-action undo remains available. If a
  step crossed an already-saved action boundary, a restart before the corrected
  action reaches its next save can restore the original completed action; this
  is part of the initial best-effort experimental contract.
- The first slice supports a single prompt actor. A nested choice handed to a
  different player disables step replay and falls back to stable full-action
  undo.
- Keep a small maximum number of entries per root action and reject replay across
  turn/generation boundaries.
- Do not ship the current card-specific `PendingCardSelection` checkpoint as the
  generic solution. It can remain an uncommitted reference until the replay
  proof is green, then should be removed or reduced to unrelated hidden-info
  detection only.

## Decision log

- 2026-07-13: Separate stable action undo from experimental one-step undo.
- 2026-07-13: Use root snapshot plus deterministic input replay as the preferred
  continuation model.
- 2026-07-13: Drop the extra confirmation-before-card-selection design.
