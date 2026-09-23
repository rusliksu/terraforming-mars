import {LogMessage} from './LogMessage';
import {LogMessageType} from './LogMessageType';

export type ActionLogEntry =
  | {kind: 'action', id: string, messages: ReadonlyArray<LogMessage>, complete: boolean}
  | {kind: 'message', message: LogMessage};

/** Groups visible messages only when their recorded action boundary is intact. */
export function groupActionLogs(messages: ReadonlyArray<LogMessage>): Array<ActionLogEntry> {
  const entries: Array<ActionLogEntry> = [];
  let index = 0;
  while (index < messages.length) {
    const first = messages[index];
    if (first.actionId === undefined || first.canceled === true || first.type === LogMessageType.NEW_GENERATION) {
      entries.push({kind: 'message', message: first});
      index++;
      continue;
    }

    const group: Array<LogMessage> = [];
    while (index < messages.length && messages[index].actionId === first.actionId &&
        messages[index].canceled !== true && messages[index].type !== LogMessageType.NEW_GENERATION) {
      group.push(messages[index]);
      index++;
    }

    if (first.actionStart === true && group.some((message) => message.effect === undefined)) {
      entries.push({kind: 'action', id: first.actionId, messages: group, complete: group.at(-1)?.actionEnd === true});
    } else {
      entries.push(...group.map((message): ActionLogEntry => ({kind: 'message', message})));
    }
  }
  return entries;
}
