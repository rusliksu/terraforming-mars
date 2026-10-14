import {CardModel} from '@/common/models/CardModel';
import {ClientCard} from '@/common/cards/ClientCard';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {getCard, getCardOrThrow} from './ClientCardManifest';
import {buildClientCardFromCustom} from './CustomCardAdapter';

/** Same static-first, custom-wire fallback used by our canonical card renderer. */
export function resolveCardModel(card: CardModel): ClientCard {
  const resolved = getCard(card.name) ?? (card.customCard && buildClientCardFromCustom(card.name, card.customCard));
  if (resolved === undefined || resolved === null) {
    throw new Error(`card not found ${card.name}`);
  }
  return resolved;
}

export function displayCardTags(card: CardModel, metadata: ClientCard = resolveCardModel(card)): Array<Tag> {
  const tags = [...metadata.tags || []].map((tag) => tag === Tag.CLONE && card.cloneTag !== undefined ? card.cloneTag : tag);
  if (metadata.type === CardType.EVENT) {
    tags.push(Tag.EVENT);
  }
  return tags;
}

/** Our player home's existing classification, including active preludes and custom fallback priority. */
export function isActiveCard(cardModel: CardModel): boolean {
  const card = cardModel.customCard === undefined ? getCardOrThrow(cardModel.name) :
    buildClientCardFromCustom(cardModel.name, cardModel.customCard);
  return card.type === CardType.ACTIVE || card.hasAction || card.hasEffect;
}
