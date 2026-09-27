import {ClientCard} from '@/common/cards/ClientCard';
import {CardName} from '@/common/cards/CardName';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {CardRenderItemType} from '@/common/cards/render/CardRenderItemType';
import {ICardRenderItem, ICardRenderRoot} from '@/common/cards/render/Types';

export const CARD_TYPES = [CardType.AUTOMATED, CardType.ACTIVE, CardType.EVENT] as const;
export const CARD_TAGS = [
  Tag.BUILDING, Tag.SPACE, Tag.SCIENCE, Tag.POWER, Tag.EARTH,
  Tag.JOVIAN, Tag.VENUS, Tag.MOON, Tag.MARS, Tag.PLANT,
  Tag.MICROBE, Tag.ANIMAL, Tag.CITY, Tag.CRIME, Tag.WILD,
] as const;
export const ICON_TYPES = [
  CardRenderItemType.MEGACREDITS,
  CardRenderItemType.STEEL,
  CardRenderItemType.TITANIUM,
  CardRenderItemType.PLANTS,
  CardRenderItemType.ENERGY,
  CardRenderItemType.HEAT,
  CardRenderItemType.CARDS,
] as const;

export type CardDraft = {
  version: 1;
  name: string;
  type: typeof CARD_TYPES[number];
  cost: number;
  tags: Array<typeof CARD_TAGS[number]>;
  victoryPoints: number;
  description: string;
  iconType: typeof ICON_TYPES[number] | '';
  iconAmount: number;
};

export function newCardDraft(): CardDraft {
  return {
    version: 1,
    name: '',
    type: CardType.AUTOMATED,
    cost: 8,
    tags: [],
    victoryPoints: 0,
    description: '',
    iconType: '',
    iconAmount: 1,
  };
}

export function parseCardDraft(text: string): CardDraft {
  const value: unknown = JSON.parse(text);
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Card code must be an object.');
  }
  const draft = value as Record<string, unknown>;
  if (draft.version !== 1 ||
      typeof draft.name !== 'string' || draft.name.length > 80 ||
      !CARD_TYPES.includes(draft.type as CardDraft['type']) ||
      !Number.isInteger(draft.cost) || Number(draft.cost) < 0 || Number(draft.cost) > 100 ||
      !Array.isArray(draft.tags) || draft.tags.length > 4 ||
      !draft.tags.every((tag: unknown) => CARD_TAGS.includes(tag as CardDraft['tags'][number])) ||
      new Set(draft.tags).size !== draft.tags.length ||
      !Number.isInteger(draft.victoryPoints) || Number(draft.victoryPoints) < -10 || Number(draft.victoryPoints) > 20 ||
      typeof draft.description !== 'string' || draft.description.length > 400 ||
      !(draft.iconType === '' || ICON_TYPES.includes(draft.iconType as typeof ICON_TYPES[number])) ||
      !Number.isInteger(draft.iconAmount) || Number(draft.iconAmount) < 1 || Number(draft.iconAmount) > 30) {
    throw new Error('Card code contains invalid or unsupported fields.');
  }
  if (draft.type === CardType.EVENT && draft.tags.length > 3) {
    throw new Error('Event cards can have at most three additional tags.');
  }
  return {
    version: 1,
    name: draft.name as string,
    type: draft.type as CardDraft['type'],
    cost: draft.cost as number,
    tags: draft.tags as CardDraft['tags'],
    victoryPoints: draft.victoryPoints as number,
    description: draft.description as string,
    iconType: draft.iconType as CardDraft['iconType'],
    iconAmount: draft.iconAmount as number,
  };
}

export function previewCard(draft: CardDraft): ClientCard {
  let renderData: ICardRenderRoot | undefined;
  if (draft.iconType !== '') {
    const item: ICardRenderItem = {is: 'item', type: draft.iconType, amount: draft.iconAmount, showDigit: true};
    renderData = {is: 'root', rows: [[item]]};
  }
  return {
    name: (draft.name.trim() || 'Untitled card') as CardName,
    module: 'base',
    tags: draft.tags,
    cost: draft.cost,
    type: draft.type,
    compatibility: [],
    hasAction: draft.type === CardType.ACTIVE,
    hasEffect: false,
    metadata: {
      description: draft.description,
      renderData,
      victoryPoints: draft.victoryPoints === 0 ? undefined : draft.victoryPoints,
    },
  };
}
