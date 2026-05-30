export function playerTableauVisibilityKey(playerIndex: number): string {
  return `pinned_player_${playerIndex}`;
}

export function spectatorHandVisibilityKey(playerIndex: number): string {
  return `spectator_hand_${playerIndex}`;
}
