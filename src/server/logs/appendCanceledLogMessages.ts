import {LogMessage} from '../../common/logs/LogMessage';
import {IGame} from '../IGame';

export function appendCanceledLogMessages(current: IGame, restored: IGame, startIndex = restored.gameLog.length): void {
  const canceledMessages: Array<LogMessage> = [];
  let canceledCount = 0;

  for (let index = startIndex; index < current.gameLog.length; index++) {
    const message = current.gameLog[index];
    if (message?.canceled === true) {
      continue;
    }

    const restoredMessage = restored.gameLog[index];
    if (restoredMessage !== undefined &&
        restoredMessage.canceled !== true &&
        sameLogMessage(restoredMessage, message)) {
      restoredMessage.canceled = true;
    } else {
      const copy = JSON.parse(JSON.stringify(message)) as LogMessage;
      copy.canceled = true;
      canceledMessages.push(copy);
    }
    canceledCount++;
  }

  if (canceledCount === 0) {
    return;
  }

  restored.gameLog.push(...canceledMessages);
  restored.gameAge += canceledCount;
}

function sameLogMessage(a: LogMessage, b: LogMessage): boolean {
  return a.message === b.message &&
    a.type === b.type &&
    a.playerId === b.playerId &&
    JSON.stringify(a.data) === JSON.stringify(b.data) &&
    JSON.stringify(a.hiddenFor) === JSON.stringify(b.hiddenFor);
}
