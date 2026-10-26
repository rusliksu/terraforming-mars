import type {PlayerInputModel} from '@/common/models/PlayerInputModel';
import type {CardName} from '@/common/cards/CardName';
import type {Message} from '@/common/logs/Message';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {getCard} from '@/client/cards/ClientCardManifest';
import {titleKey} from './orOptionsShortLabels';

const CARD_IN_TITLE = /^Select an option for (.+)$/;
const GENERIC_TITLES = new Set(['Select one option', 'Select an option']);

export function inputSourceCard(input: PlayerInputModel): CardName | undefined {
  if (input.type === 'amount' && input.preview !== undefined) {
    return getCard(input.preview.sourceCard)?.name;
  }
  const match = CARD_IN_TITLE.exec(titleKey(input.title));
  return match === null ? undefined : getCard(match[1] as CardName)?.name;
}

export function optionSourceCard(input: PlayerInputModel): CardName | undefined {
  const source = inputSourceCard(input);
  if (source !== undefined || typeof input.title === 'string') {
    return source;
  }
  const card = input.title.data.find((data) => data.type === LogMessageDataType.CARD);
  return card === undefined ? undefined : getCard(card.value as CardName)?.name;
}

export function cardDescriptionText(name: CardName): string | undefined {
  const description = getCard(name)?.metadata.description;
  return typeof description === 'string' ? description : description?.text;
}

export function isGenericTitle(title: string | Message): boolean {
  const key = titleKey(title);
  return GENERIC_TITLES.has(key) || CARD_IN_TITLE.test(key);
}
