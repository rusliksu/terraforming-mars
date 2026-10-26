import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {max} from '../Options';

export class FloatingRig extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.FLOATING_RIG,
      tags: [Tag.VENUS, Tag.BUILDING],
      cost: 6,

      resourceType: CardResource.FLOATER,
      victoryPoints: {resourcesHere: {}, per: 2},
      requirements: {venus: 16, max},

      behavior: {
        production: {energy: 1},
      },

      action: {
        spend: {steel: 1},
        addResources: 1,
      },

      metadata: {
        cardNumber: '147',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 1 steel to add a floater to this card.', (eb) => {
            eb.steel(1).startAction.resource(CardResource.FLOATER);
          }).br;
          b.production((pb) => pb.energy(1)).br;
          b.vpText('1 VP for every 2 floaters on this card.');
        }),
        description: 'Requires max 16% Venus. Increase your energy production 1 step.',
      },
    });
  }
}
