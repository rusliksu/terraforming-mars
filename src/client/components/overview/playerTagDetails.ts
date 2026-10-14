import {ViewModel, PublicPlayerModel} from '@/common/models/PlayerModel';
import {GameModel} from '@/common/models/GameModel';
import {Tag} from '@/common/cards/Tag';
import {SpecialTags} from '@/client/cards/SpecialTags';
import {PartyName} from '@/common/turmoil/PartyName';
import {getCard} from '@/client/cards/ClientCardManifest';
import {CardName} from '@/common/cards/CardName';

export type InterfaceTagsType = Tag | SpecialTags | 'separator' | 'all';
export type TagDetail = {
  name: InterfaceTagsType;
  discount: number;
  points: number;
  halfPoints: number;
  count: number;
  asterisk: boolean;
  substitution?: Tag;
};

export type TagDetails = {
  all: TagDetail;
  tagsInOrder: Array<TagDetail>;
};

const ORDER: Array<InterfaceTagsType> = [
  Tag.BUILDING,
  Tag.SPACE,
  Tag.SCIENCE,
  Tag.POWER,
  Tag.EARTH,
  Tag.JOVIAN,
  Tag.VENUS,
  Tag.PLANT,
  Tag.MICROBE,
  Tag.ANIMAL,
  Tag.CITY,
  Tag.MOON,
  Tag.MARS,
  Tag.CRIME,
  Tag.GALACTIC,
  'separator',
  Tag.EVENT,
  SpecialTags.NONE,
  Tag.WILD,
  SpecialTags.INFLUENCE,
  SpecialTags.CITY_COUNT,
  SpecialTags.COLONY_COUNT,
  SpecialTags.UNDERGROUND_TOKEN_COUNT,
  SpecialTags.CORRUPTION,
  SpecialTags.NEGATIVE_VP,
];

const isInGame = (tag: InterfaceTagsType, game: GameModel): boolean => {
  const gameOptions = game.gameOptions;
  if (game.turmoil === undefined && tag === SpecialTags.INFLUENCE) {
    return false;
  }
  switch (tag) {
  case SpecialTags.COLONY_COUNT:
    return gameOptions.expansions.colonies !== false;
  case SpecialTags.INFLUENCE:
    return game.turmoil !== undefined;
  case SpecialTags.UNDERGROUND_TOKEN_COUNT:
  case SpecialTags.CORRUPTION:
  case SpecialTags.NEGATIVE_VP:
    return gameOptions.expansions.underworld !== false;
  case Tag.VENUS:
  case Tag.MOON:
  case Tag.MARS:
  case Tag.CRIME:
  case Tag.GALACTIC:
    return game.tags.includes(tag);
  }
  return true;
};

const getTagCount = (tagName: InterfaceTagsType, player: PublicPlayerModel): number => {
  switch (tagName) {
  case SpecialTags.COLONY_COUNT:
    return player.coloniesCount || 0;
  case SpecialTags.INFLUENCE:
    return player.influence || 0;
  case SpecialTags.CITY_COUNT:
    return player.citiesCount || 0;
  case SpecialTags.NONE:
    return player.noTagsCount || 0;
  case SpecialTags.UNDERGROUND_TOKEN_COUNT:
    return player.underworldData.tokens.length;
  case SpecialTags.CORRUPTION:
    return player.underworldData.corruption;
  case SpecialTags.NEGATIVE_VP:
    return player.victoryPointsBreakdown.negativeVP;
  case 'separator':
  case 'all':
    return -1;
  default:
    return player.tags[tagName];
  }
};

export const TAG_ORDER = ORDER;
export const isTagInGame = isInGame;

export function isVictoryPointCountHidden(player: PublicPlayerModel, view: ViewModel): boolean {
  return !view.game.gameOptions.showOtherPlayersVP && player.color !== view.thisPlayer?.color;
}

export function buildTagDetails(player: PublicPlayerModel, view: ViewModel): TagDetails {
  type TagDetails = Record<InterfaceTagsType | 'all', TagDetail>;

  // Start by giving every entry a default value
  const interim = ORDER.map((key) => [
    key,
    {name: key, discount: 0, points: 0, count: getTagCount(key, player), halfPoints: 0, asterisk: false},
  ]);
  const details: TagDetails = Object.fromEntries(interim);

  // Initialize all's card discount.
  details['all'] = {
    name: 'all',
    discount: player?.cardDiscount ?? 0,
    points: 0,
    count: 0,
    halfPoints: 0,
    asterisk: false,
  };

  // For each card
  for (const card of player.tableau) {
    // Calculate discount
    for (const discount of card.discount ?? []) {
      const tag = discount.tag ?? 'all';
      details[tag].discount += discount.amount;
    }

    // See https://github.com/terraforming-mars/terraforming-mars/issues/5236
    if (card.name === CardName.CULTIVATION_OF_VENUS || card.name === CardName.VENERA_BASE) {
      details[Tag.VENUS].halfPoints++;
    } else {
      const vps = getCard(card.name)?.victoryPoints;
      if (vps !== undefined && typeof(vps) !== 'number' && vps !== 'special') {
        // Special case Commercial District etc.
        const asterisk = vps.nextToThis !== undefined;
        if (vps.tag !== undefined) {
          if (!asterisk) {
            details[vps.tag].points += ((vps.each ?? 1) / (vps.per ?? 1));
          } else {
            details[vps.tag].asterisk = true;
          }
        }
        if (vps.cities !== undefined) {
          if (!asterisk) {
            details['city-count'].points += ((vps.each ?? 1) / (vps.per ?? 1));
          } else {
            details['city-count'].asterisk = true;
          }
        }
      }
    }
  }

  // Other modifiers
  if (view.game.turmoil?.ruling === PartyName.UNITY &&
    view.game.turmoil.politicalAgendas?.unity?.policyId === 'up04') {
    details[Tag.SPACE].discount += 2;
  }

  // Tag substitutions
  for (const card of player.tableau) {
    if (card.name === CardName.EARTH_EMBASSY) {
      details[Tag.EARTH].substitution = Tag.MOON;
    }
    if (card.name === CardName.HABITAT_MARTE) {
      details[Tag.SCIENCE].substitution = Tag.MARS;
    }
  }

  // Put them in order.
  const tagsInOrder = [];
  for (const tag of ORDER) {
    const entry = details[tag];
    tagsInOrder.push(entry);
  }

  return {
    all: details['all'],
    tagsInOrder,
  };
}
