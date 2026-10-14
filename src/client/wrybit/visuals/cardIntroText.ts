import {CardModel} from '@/common/models/CardModel';
import {CardName} from '@/common/cards/CardName';
import {Message} from '@/common/logs/Message';
import {getCard} from '@/client/cards/ClientCardManifest';
import {resolveCardModel} from '@/client/cards/CardModelMetadata';

const CARD_IN_TITLE = /^Select an option for (.+)$/;
const GENERIC_TITLES: ReadonlySet<string> = new Set(['Select one option', 'Select an option']);
function titleKey(title: string | Message): string {
  return typeof title === 'string' ? title : title.message;
}

// Short card text as explanation; undefined if the card only has it as icons
export function cardDescriptionText(name: CardName, model?: CardModel): string | undefined {
  const description = (model === undefined ? getCard(name) : resolveCardModel(model))?.metadata.description;
  if (description === undefined) {
    return undefined;
  }
  return typeof description === 'string' ? description : description.text;
}

// Whether the question still says something next to the card ("Select a player …") or is just "Select an option"
export function isGenericTitle(title: string | Message): boolean {
  const key = titleKey(title);
  return GENERIC_TITLES.has(key) || CARD_IN_TITLE.test(key);
}
