import {IParty} from './IParty';
import {Party} from './Party';
import {PartyName} from '../../../common/turmoil/PartyName';
import {Tag} from '../../../common/cards/Tag';
import {Resource} from '../../../common/Resource';
import {IPolicy} from '../Policy';
import {IPlayer} from '../../IPlayer';
import {ICard} from '../../cards/ICard';
import {CardResource} from '../../../common/CardResource';
import {ChooseTagPolicy} from './ChooseTagPolicy';
import {GREENS_BONUS_1, GREENS_BONUS_2, GREENS_POLICY_1} from './Greens';

/**
 * More Parties: the "Political Agendas" rework of Greens. Its A/B bonuses and its first policy
 * are identical to the official party (reused directly); the other 3 policies are new.
 */
export class GreensMoreParties extends Party implements IParty {
  readonly name = PartyName.GREENS;
  readonly bonuses = [GREENS_BONUS_1, GREENS_BONUS_2];
  readonly policies = [GREENS_POLICY_1, GREENS_MORE_PARTIES_POLICY_2, GREENS_MORE_PARTIES_POLICY_3, GREENS_MORE_PARTIES_POLICY_4];
}

class GreensMorePartiesPolicy02 implements IPolicy {
  readonly id = 'gp02' as const;
  readonly description = 'Gain 1 plant resource every time you place a tile on Mars';

  onTilePlaced(player: IPlayer) {
    player.stock.add(Resource.PLANTS, 1, {log: true, from: {partyName: PartyName.GREENS}});
  }
}

class GreensMorePartiesPolicy03 implements IPolicy {
  readonly id = 'gp03' as const;
  readonly description = 'Every time you play a card with a plant, microbe or animal tag, ' +
    'gain 1 plant resource or place the corresponding resource on that card';

  onCardPlayed(player: IPlayer, card: ICard) {
    const matchCount = card.tags.filter((tag) => tag === Tag.PLANT || tag === Tag.MICROBE || tag === Tag.ANIMAL).length;
    // Plant is a standard resource (not a card resource), so only a microbe/animal-tagged card
    // that itself holds the matching card resource has a "corresponding resource" to place;
    // every other match (including all plant-tagged cards) just grants a plant instead.
    const canPlaceOnCard = card.resourceType === CardResource.MICROBE || card.resourceType === CardResource.ANIMAL;
    for (let i = 0; i < matchCount; i++) {
      if (canPlaceOnCard) {
        player.addResourceTo(card, {qty: 1, log: true, from: {partyName: PartyName.GREENS}});
      } else {
        player.stock.add(Resource.PLANTS, 1, {log: true, from: {partyName: PartyName.GREENS}});
      }
    }
  }
}

export const GREENS_MORE_PARTIES_POLICY_2 = new GreensMorePartiesPolicy02();
export const GREENS_MORE_PARTIES_POLICY_3 = new GreensMorePartiesPolicy03();
export const GREENS_MORE_PARTIES_POLICY_4 = new ChooseTagPolicy('gp04', PartyName.GREENS, 'plant tag or animal tag', () => [Tag.PLANT, Tag.ANIMAL]);
