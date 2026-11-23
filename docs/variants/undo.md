# Undo options

Terraforming Mars offers two separate undo rules when a game is created.

## Undo action

Restores the game to the beginning of the current action, or to the previous
completed action when the current action has not started yet. This is the
stable fallback and is still provided on a best-effort basis.

If the action revealed hidden information, the player must confirm the undo.
The confirmed irreversible undo is recorded in the public game log.

## Undo one step (experimental)

Returns to the previous logical choice inside the current action without
discarding the whole action. For example:

- after choosing a card revealed by Hi-Tech Lab, it returns to the same card
  choice with the same cards;
- after choosing and placing a Project Eden city, it returns to Project Eden's
  effect-choice screen, so the player can choose the city again and place it
  elsewhere.

Choosing a placement type and choosing its board space count as one logical
step. If the placement revealed hidden information, such as drawing a card from
a board bonus, the player must confirm the undo and the irreversible undo is
recorded in the public game log.

The step journal is persisted next to the game save: the root of the action is
stored as a reference to its save, and the steps themselves live in the
`game_action_replay` tables. A restart therefore keeps one-step undo available
for games created with the option.

Restoration is fail-closed. The stored root snapshot and the recorded steps are replayed
to rebuild the prompt, so prompts that hold deferred actions survive a restart even
though a plain save/load cannot rebuild them. If a stored step no longer replays,
the journal is dropped and the game loads without one-step undo; action undo
remains a separate fallback when enabled. Setting
`TM_DISABLE_REPLAY_JOURNAL=1` turns the persistence off without a schema
change.
