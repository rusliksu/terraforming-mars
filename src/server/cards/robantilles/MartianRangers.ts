import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardResource} from '../../../common/CardResource';
import {CardRenderer} from '../render/CardRenderer';

/**
 * The "opponents cannot remove your animals" clause is implemented in
 * RemoveResourcesFromCard.getAvailableTargetCards (see the opponentHasMartianRangers
 * check there), mirroring the existing Protected Habitats guard for Animal/Microbe
 * resources.
 */
export class MartianRangers extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MARTIAN_RANGERS,
      tags: [Tag.ANIMAL, Tag.EARTH],
      cost: 12,

      behavior: {
        addResourcesToAnyCard: {type: CardResource.ANIMAL, count: 2, min: 1, mustHaveCard: true},
      },

      metadata: {
        cardNumber: 'H35',
        renderData: CardRenderer.builder((b) => {
          b.plainText('Effect: Opponents cannot remove your Animals.', true).br;
          b.plainText('Add 2 Animals to a card that already has at least 1 Animal on it.', true);
        }),
      },
    });
  }
}
