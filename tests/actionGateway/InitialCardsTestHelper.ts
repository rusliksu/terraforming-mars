import {InputResponse} from '../../src/common/inputs/InputResponse';
import {PlayerId} from '../../src/common/Types';
import {EngineHandle} from '../../src/server/engine/worker';

export type PromptModel = {
  type?: string;
  title?: string;
  options?: Array<PromptModel & {cards?: Array<{name: string}>; min?: number}>;
};

/**
 * Test-only planner for base + Prelude prompts. It turns the current prompt
 * model into a legal first response; it is not used by production code.
 */
export function chooseResponse(
  input: {type: string; toModel(player: unknown): unknown; options?: Array<unknown>; cards?: Array<{name: string}>; config?: {min?: number}},
  model: PromptModel,
): InputResponse {
  switch (input.type) {
  case 'initialCards': {
    const options = (input as unknown as {options: Array<unknown>}).options;
    return {
      type: 'initialCards',
      responses: options.map((option, index) => {
        const optionModel = model.options?.[index];
        if (optionModel?.title === 'Select initial cards to buy') {
          return {type: 'card', cards: []};
        }
        return chooseCardResponse(option as {cards: Array<{name: string}>; config?: {min?: number}}, optionModel);
      }),
    } as InputResponse;
  }
  case 'or': {
    const options = (input as unknown as {options: Array<unknown>}).options;
    return {
      type: 'or',
      index: 0,
      response: chooseResponse(options[0] as {type: string; toModel(player: unknown): unknown}, model.options?.[0] ?? {}),
    } as InputResponse;
  }
  case 'card':
    return chooseCardResponse(input as {cards: Array<{name: string}>; config?: {min?: number}}, model);
  case 'option':
    return {type: 'option'} as InputResponse;
  case 'amount': {
    const configuredMin = (input as unknown as {config?: {min?: number}}).config?.min;
    return {type: 'amount', amount: configuredMin ?? 1} as InputResponse;
  }
  case 'player': {
    const players = (input as unknown as {players: Array<{id: PlayerId}>}).players;
    return {type: 'player', player: players[0].id} as InputResponse;
  }
  case 'space': {
    const spaces = (input as unknown as {spaces: Array<{id: string}>}).spaces;
    return {type: 'space', spaceId: spaces[0].id} as InputResponse;
  }
  default:
    throw new Error('Unsupported prompt in base+Prelude test planner: ' + input.type);
  }
}

export function chooseCardResponse(
  input: {cards: Array<{name: string}>; config?: {min?: number}},
  _model?: PromptModel,
): InputResponse {
  const min = input.config?.min ?? 0;
  return {
    type: 'card',
    cards: input.cards.slice(0, min).map((card) => card.name),
  } as InputResponse;
}

export function firstInput(handle: EngineHandle, actorId: PlayerId): InputResponse {
  const player = handle.game.getPlayerById(actorId);
  const waitingFor = player.getWaitingFor();
  if (waitingFor === undefined) {
    throw new Error('Expected an initial prompt');
  }
  return chooseResponse(
    waitingFor as unknown as {type: string; toModel(player: unknown): unknown},
    waitingFor.toModel(player) as PromptModel,
  );
}
