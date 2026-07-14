import {InputResponse} from '../../common/inputs/InputResponse';
import {PlayerId} from '../../common/Types';
import {Game} from '../Game';
import {IGame} from '../IGame';
import {SerializedGame} from '../SerializedGame';
import {promptFingerprintFromWaitingFor} from './promptFingerprint';

const MAX_ACTION_REPLAY_ENTRIES = 32;

export interface ActionInputEntry {
  actorId: PlayerId;
  promptFingerprint: string;
  input: InputResponse;
  /** The first log entry that belongs to this input. */
  logStartIndex?: number;
  /** Treat an option choice and the immediately following tile placement as one logical step. */
  continuesThroughNextInput?: boolean;
}

export interface ActionReplayState {
  rootSnapshot: SerializedGame;
  entries: Array<ActionInputEntry>;
  currentActorId: PlayerId;
  currentPromptFingerprint: string;
  /** Preserve one-step undo at a newly saved root until the player submits the next input. */
  resetBeforeNextInput: boolean;
  /** The first log entry canceled by the most recent step undo. */
  lastStepBackLogStartIndex?: number;
}

export class ActionReplayMismatch extends Error {}

export function promptFingerprintForPlayer(game: IGame, actorId: PlayerId): string {
  const actor = game.getPlayerById(actorId);
  return promptFingerprintFromWaitingFor(actor.getWaitingFor()?.toModel(actor));
}

/** Starts a journal only when the current prompt can be reconstructed from this snapshot. */
export function prepareActionReplayEntry(
  game: IGame,
  actorId: PlayerId,
  input: InputResponse,
): ActionInputEntry | undefined {
  if (game.actionReplayState !== undefined &&
      game.actionReplayState !== null &&
      game.actionReplayState.resetBeforeNextInput) {
    game.actionReplayState = undefined;
  }
  if (game.actionReplayState === null) {
    return undefined;
  }

  const currentPromptFingerprint = promptFingerprintForPlayer(game, actorId);
  if (game.actionReplayState === undefined) {
    const rootSnapshot = game.serialize();
    try {
      const replayedRoot = replayActionInputs(rootSnapshot, []);
      if (promptFingerprintForPlayer(replayedRoot, actorId) !== currentPromptFingerprint) {
        game.actionReplayState = null;
        return undefined;
      }
      game.actionReplayState = {
        rootSnapshot,
        entries: [],
        currentActorId: actorId,
        currentPromptFingerprint,
        resetBeforeNextInput: false,
      };
    } catch (_error) {
      game.actionReplayState = null;
      return undefined;
    }
  }

  const state = game.actionReplayState;
  if (state.currentActorId !== actorId || state.currentPromptFingerprint !== currentPromptFingerprint) {
    game.actionReplayState = null;
    return undefined;
  }
  return {
    actorId,
    promptFingerprint: currentPromptFingerprint,
    input: JSON.parse(JSON.stringify(input)) as InputResponse,
    logStartIndex: game.gameLog.length,
  };
}

export function recordAcceptedActionReplayEntry(game: IGame, entry: ActionInputEntry): void {
  const state = game.actionReplayState;
  if (state === undefined || state === null) {
    return;
  }
  const actor = game.getPlayerById(entry.actorId);
  if (actor.getWaitingFor() === undefined) {
    game.actionReplayState = null;
    return;
  }
  if (state.entries.length >= MAX_ACTION_REPLAY_ENTRIES) {
    game.actionReplayState = null;
    return;
  }
  const nextPrompt = actor.getWaitingFor()?.toModel(actor);
  if (entry.input.type === 'or' && nextPrompt?.type === 'space') {
    entry.continuesThroughNextInput = true;
  }
  state.entries.push(entry);
  state.currentActorId = entry.actorId;
  state.currentPromptFingerprint = promptFingerprintForPlayer(game, entry.actorId);
}

export function stepBackActionInput(current: IGame, actorId: PlayerId): Game {
  const state = current.actionReplayState;
  if (state === undefined || state === null || state.entries.length === 0) {
    throw new ActionReplayMismatch('No replayable previous step');
  }
  if (state.currentActorId !== actorId ||
      promptFingerprintForPlayer(current, actorId) !== state.currentPromptFingerprint) {
    throw new ActionReplayMismatch('The current prompt no longer matches the replay journal');
  }

  const replayedCurrent = replayActionInputs(state.rootSnapshot, state.entries);
  if (promptFingerprintForPlayer(replayedCurrent, actorId) !== state.currentPromptFingerprint) {
    throw new ActionReplayMismatch('The action can no longer be replayed deterministically');
  }

  let removeFromIndex = state.entries.length - 1;
  if (removeFromIndex > 0 && state.entries[removeFromIndex - 1].continuesThroughNextInput === true) {
    removeFromIndex -= 1;
  }
  const removedEntry = state.entries[removeFromIndex];
  const remainingEntries = state.entries.slice(0, removeFromIndex);
  const replayed = replayActionInputs(state.rootSnapshot, remainingEntries);
  const predecessorFingerprint = promptFingerprintForPlayer(replayed, removedEntry.actorId);
  if (predecessorFingerprint !== removedEntry.promptFingerprint) {
    throw new ActionReplayMismatch('Replay did not return to the expected previous prompt');
  }

  restoreLiveOnlyState(replayed, current);
  replayed.actionReplayState = {
    rootSnapshot: state.rootSnapshot,
    entries: remainingEntries,
    currentActorId: removedEntry.actorId,
    currentPromptFingerprint: predecessorFingerprint,
    resetBeforeNextInput: false,
    lastStepBackLogStartIndex: removedEntry.logStartIndex,
  };
  return replayed;
}

/**
 * Rebuilds an intermediate prompt from a restorable root snapshot.
 *
 * The returned game stays in simulation mode. Callers must validate it before
 * deliberately promoting it to live state.
 */
export function replayActionInputs(rootSnapshot: SerializedGame, entries: ReadonlyArray<ActionInputEntry>): Game {
  const snapshot = JSON.parse(JSON.stringify(rootSnapshot)) as SerializedGame;
  for (const player of snapshot.players) {
    // Replaying prompts must not emit or delete real turn notices.
    player.telegramID = undefined;
    player.lastNoticeMessageId = -1;
    player.lastTurnNoticeKey = undefined;
    player.lastTurnReminderNoticeKey = undefined;
  }

  const game = Game.deserialize(snapshot, {simulation: true});
  for (const [index, entry] of entries.entries()) {
    const actualFingerprint = promptFingerprintForPlayer(game, entry.actorId);
    if (actualFingerprint !== entry.promptFingerprint) {
      throw new ActionReplayMismatch(
        `Prompt mismatch at replay input ${index}: expected ${entry.promptFingerprint}, got ${actualFingerprint}`,
      );
    }
    const actor = game.getPlayerById(entry.actorId);
    actor.process(JSON.parse(JSON.stringify(entry.input)) as InputResponse);
  }
  return game;
}

function restoreLiveOnlyState(replayed: Game, current: IGame): void {
  replayed.simulationMode = false;
  replayed.lastSaveId = current.lastSaveId;
  replayed.shadowInputSeq = current.shadowInputSeq;
  replayed.undoCount = current.undoCount;
  for (const replayedPlayer of replayed.players) {
    const currentPlayer = current.getPlayerById(replayedPlayer.id);
    replayedPlayer.telegramID = currentPlayer.telegramID;
    replayedPlayer.lastNoticeMessageId = currentPlayer.lastNoticeMessageId;
    replayedPlayer.lastTurnNoticeKey = currentPlayer.lastTurnNoticeKey;
    replayedPlayer.lastTurnReminderNoticeKey = currentPlayer.lastTurnReminderNoticeKey;
  }
}
