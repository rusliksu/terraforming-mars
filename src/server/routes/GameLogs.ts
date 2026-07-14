import {LogMessage} from '../../common/logs/LogMessage';
import {LogMessageType} from '../../common/logs/LogMessageType';
import {ParticipantId} from '../../common/Types';
import {IGame} from '../IGame';
import {Phase} from '../../common/Phase';
import {Log} from '../../common/logs/Log';
import {LogMessageData} from '../../common/logs/LogMessageData';
import {LogMessageDataType} from '../../common/logs/LogMessageDataType';

export class GameLogs {
  private shiftDataPlaceholders(message: string): string {
    return message.replace(/\$\{(\d{1,2})\}/gi, (_match, idx) => {
      return '${' + (Number(idx) + 1) + '}';
    });
  }

  private cloneMessage(message: LogMessage, text: string, data: Array<LogMessageData>): LogMessage {
    const clone = new LogMessage(message.type ?? LogMessageType.DEFAULT, text, data, message.playerId);
    clone.timestamp = message.timestamp;
    return clone;
  }

  private labelPrivateMessageOwner(message: LogMessage, game: IGame): LogMessage {
    if (message.playerId === undefined) {
      return message;
    }
    const player = game.players.find((player) => player.id === message.playerId);
    if (player === undefined) {
      return message;
    }

    const owner: LogMessageData = {type: LogMessageDataType.PLAYER, value: player.color};
    if (message.message.startsWith('You ')) {
      return this.cloneMessage(
        message,
        '${0} ' + this.shiftDataPlaceholders(message.message.substring(4)),
        [owner, ...message.data],
      );
    }
    const firstDatum = message.data[0];
    if (firstDatum?.type === LogMessageDataType.STRING && firstDatum.value === 'You') {
      return this.cloneMessage(message, message.message, [owner, ...message.data.slice(1)]);
    }
    return message;
  }

  private getRecentLogLimit(limit: string | null): number {
    if (limit === null) {
      return 50;
    }
    const parsed = Number(limit);
    if (!Number.isInteger(parsed) || parsed < 1) {
      return 50;
    }
    return Math.min(parsed, 100);
  }

  private getLogsForGeneration(messages: Array<LogMessage>, generation: number): Array<LogMessage> {
    let foundStart = generation === 1;
    const newMessages = [];
    for (const message of messages) {
      if (message.type === LogMessageType.NEW_GENERATION && message.canceled !== true) {
        const value = Number(message.data[0]?.value);
        if (value === generation) {
          foundStart = true;
        } else if (value === generation + 1) {
          break;
        }
      }
      if (foundStart === true) {
        newMessages.push(message);
      }
    }
    return newMessages;
  }

  public getLogsForGameView(playerId: ParticipantId, game: IGame, generation: string | null, limit: string | null = null): Array<LogMessage> {
    const showAllMessages = playerId === game.spectatorId && game.phase === Phase.END;
    const messagesForPlayer = (message: LogMessage) => {
      try {
        if (message === undefined || message === null) {
          return false;
        }
        if (message.hiddenFor?.includes(playerId)) {
          return false;
        }
        if (showAllMessages) {
          return true;
        }
        return message.playerId === undefined || message.playerId === playerId;
      } catch (e) {
        console.error('Error checking message for player', e);
        return false;
      }
    };

    // Default view keeps the payload small. An explicit generation request should
    // always return the full generation, including the current one.
    const labelOwner = (message: LogMessage) => showAllMessages ? this.labelPrivateMessageOwner(message, game) : message;
    if (generation === null) {
      return game.gameLog.filter(messagesForPlayer).slice(-this.getRecentLogLimit(limit)).map(labelOwner);
    }
    return this.getLogsForGeneration(game.gameLog, Number(generation)).filter(messagesForPlayer).map(labelOwner);
  }

  public getLogsForGameEnd(game: IGame): Array<string> {
    if (game.phase !== Phase.END) {
      throw new Error('Game is not over');
    }

    return game.gameLog.filter((message) => message.canceled !== true).map((message) => Log.applyData(this.labelPrivateMessageOwner(message, game), (datum: LogMessageData) => {
      if (datum.type === undefined || datum.value === undefined) {
        return '';
      }

      switch (datum.type) {
      case LogMessageDataType.PLAYER:
        for (const player of game.players) {
          if (datum.value === player.color) {
            return player.name;
          }
        }
        // Fall-back, show the player color.
        return datum.value;

      case LogMessageDataType.CARD:
      case LogMessageDataType.GLOBAL_EVENT:
      case LogMessageDataType.TILE_TYPE:
      case LogMessageDataType.COLONY:
      default:
        return datum.value.toString();
      }
    }));
  }
}
