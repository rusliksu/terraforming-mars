import {Phase} from '../../common/Phase';
import {Game} from '../Game';
import {IGame} from '../IGame';
import {IPlayer} from '../IPlayer';
import type {BotTakeoverManager} from '../bot/BotTakeoverManager';
import type {IGameLoader} from '../database/IGameLoader';

export type SurrenderBotManager = Pick<BotTakeoverManager, 'isActive' | 'start' | 'stop'>;

export class SurrenderError extends Error {
}

export type SurrenderResult = {
  botTakeover: 'started' | 'already-active';
};

type SurrenderPlayerOptions = {
  game: IGame;
  player: IPlayer;
  gameLoader: Pick<IGameLoader, 'add' | 'saveGame'>;
  manager: SurrenderBotManager;
  serverId: string;
  advance: () => void;
};

export async function surrenderPlayer(options: SurrenderPlayerOptions): Promise<SurrenderResult> {
  const {game, player, gameLoader, manager, serverId, advance} = options;
  validateSurrender(game, player);

  const snapshot = game.serialize();
  const previousSaveGamePromise = game.saveGamePromise;
  const botWasActive = manager.isActive(player.id);
  let persisted = false;
  let botStarted = false;

  try {
    game.surrenderedPlayerIds.add(player.id);
    advance();

    if (game.saveGamePromise !== previousSaveGamePromise) {
      await game.saveGamePromise;
    } else {
      await gameLoader.saveGame(game);
    }
    persisted = true;

    manager.start({gameId: game.id, playerId: player.id, serverId});
    botStarted = !botWasActive;
    console.info('Surrender bot takeover started', {gameId: game.id});
    return {botTakeover: botWasActive ? 'already-active' : 'started'};
  } catch (error) {
    if (botStarted || (!botWasActive && manager.isActive(player.id))) {
      manager.stop(player.id);
    }

    const restored = Game.deserialize(snapshot);
    await gameLoader.add(restored);
    if (persisted) {
      try {
        await gameLoader.saveGame(restored);
      } catch (_rollbackError) {
        console.error('Unable to persist surrender rollback', {gameId: game.id});
        throw new SurrenderError(`Unable to surrender: ${errorMessage(error)}; rollback save failed`);
      }
    }
    throw new SurrenderError(`Unable to surrender: ${errorMessage(error)}`);
  }
}

function validateSurrender(game: IGame, player: IPlayer): void {
  if (game.phase === Phase.END) {
    throw new SurrenderError('cannot surrender a finished game');
  }
  if (game.players.length <= 1) {
    throw new SurrenderError('cannot surrender a solo game');
  }
  if (game.phase !== Phase.ACTION) {
    throw new SurrenderError('can only surrender during the action phase');
  }
  if (game.activePlayer.id !== player.id) {
    throw new SurrenderError('only the active player can surrender');
  }
  if (game.botPlayerIds.has(player.id)) {
    throw new SurrenderError('automated players cannot surrender');
  }
  if (game.surrenderedPlayerIds.has(player.id)) {
    throw new SurrenderError('player already surrendered');
  }
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
