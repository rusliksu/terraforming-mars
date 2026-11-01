import type {PlayerViewModel} from '@/common/models/PlayerModel';

import {refreshGameShellBootstrap} from './GameShellBootstrapCache';
import {isGameShellEnabled} from './GameShellFeatureFlag';
import {gameShell} from './GameShellService';

/** The App fields touched by the shell integration. */
export interface GameShellAppState {
  playerView?: PlayerViewModel;
  playerkey: number;
}

export interface RestoredGameShellAppState {
  playerView: PlayerViewModel | undefined;
  playerkey: number;
  playerHome: boolean;
}

/**
 * Called from App.data(). When the flag is off it returns the exact legacy
 * initial values. When it is on it restores the confirmed view from the root
 * singleton, so a remounted App renders it before the next fetch resolves.
 */
export function restoreGameShellAppState(isPlayerPath: boolean): RestoredGameShellAppState {
  if (!isGameShellEnabled()) {
    return {playerView: undefined, playerkey: 0, playerHome: false};
  }
  const playerView = gameShell.getConfirmedView();
  return {
    playerView,
    playerkey: gameShell.getViewRevision(),
    playerHome: playerView !== undefined && isPlayerPath,
  };
}

/**
 * Applies a successfully fetched player view. With the flag off this keeps
 * the legacy playerkey++ flow. With the flag on the view is published through
 * the shell and the remounted PlayerHome is keyed by the confirmed revision.
 */
export function applyFetchedPlayerView(state: GameShellAppState, playerView: PlayerViewModel): void {
  state.playerView = playerView;
  if (isGameShellEnabled()) {
    gameShell.setConfirmedView(playerView);
    state.playerkey = gameShell.getViewRevision();
    // The resync/bootstrap token rotates with the prompt; keep it fresh.
    void refreshGameShellBootstrap(playerView);
  } else {
    state.playerkey++;
  }
}

/**
 * Starts/subscribes App to shell confirmations. Returns undefined when the
 * flag is off, leaving the legacy Vue flow untouched.
 */
export function subscribeGameShellAppState(
  state: GameShellAppState,
  onConfirmedView: (playerView: PlayerViewModel) => void,
): (() => void) | undefined {
  if (!isGameShellEnabled()) {
    return undefined;
  }
  const unsubscribe = gameShell.subscribe((snapshot) => {
    const playerView = snapshot.confirmedView;
    if (playerView === undefined) {
      return;
    }
    state.playerView = playerView;
    state.playerkey = snapshot.viewRevision;
    onConfirmedView(playerView);
  });
  gameShell.start();
  return unsubscribe;
}
