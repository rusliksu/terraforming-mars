import {paths} from '@/common/app/paths';
import {LogMessage} from '@/common/logs/LogMessage';
import {ParticipantId} from '@/common/Types';

export type GenerationLog = {generation: number; messages: Array<LogMessage>};

/** Our undo can change past generations, so every snapshot reloads the whole visible stream. */
export function fetchLogStream(id: ParticipantId, generation: number, gameAge: number, signal: AbortSignal): Promise<Array<GenerationLog>> {
  return Promise.all(Array.from({length: generation}, async (_, index) => {
    const gen = index + 1;
    const response = await fetch(`${paths.API_GAME_LOGS}?id=${id}&generation=${gen}&gameAge=${gameAge}`, {signal, cache: 'no-store'});
    if (!response.ok) {
      throw new Error(`error updating messages, response code ${response.status}`);
    }
    const messages = await response.json();
    if (!Array.isArray(messages)) {
      throw new Error('error updating messages, invalid log response');
    }
    return {generation: gen, messages};
  }));
}

/** Only a true append can open a newly drawn card; rewritten undo history cannot. */
export function appendedLogMessages(previous: ReadonlyArray<GenerationLog>, current: ReadonlyArray<GenerationLog>): Array<LogMessage> {
  const appended: Array<LogMessage> = [];
  for (const section of current) {
    const before = previous.find((item) => item.generation === section.generation)?.messages ?? [];
    if (before.length > section.messages.length || before.some((message, index) => JSON.stringify(message) !== JSON.stringify(section.messages[index]))) {
      return [];
    }
    appended.push(...section.messages.slice(before.length));
  }
  return appended;
}
