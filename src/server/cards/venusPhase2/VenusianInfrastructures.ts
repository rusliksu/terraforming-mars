import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class VenusianInfrastructures extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.VENUSIAN_INFRASTRUCTURES,
      tags: [Tag.VENUS],
      cost: 11,
      requirements: {venus: 12},
      resourceType: CardResource.FLOATER,
      victoryPoints: {resourcesHere: {}, per: 2},

      action: {
        spend: {resourceFromAnyCard: {type: CardResource.ORE}},
        addResources: 2,
      },

      metadata: {
        cardNumber: 'V53',
        renderData: CardRenderer.builder((b) => {
          b.plainText('Requires Venus 12% or more. Action: spend 1 ore resource from anywhere to add 2 floaters to this card.', true);
          b.br;
          b.vpText('1 VP per 2 floaters on this card.');
        }),
      },
    });
  }
}
