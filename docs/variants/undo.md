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

The step journal is currently kept in server memory. A server restart or a
flow that cannot be replayed deterministically can make one-step undo
unavailable; action undo remains a separate fallback when enabled.
