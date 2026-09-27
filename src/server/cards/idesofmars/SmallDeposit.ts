import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class SmallDeposit extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SMALL_DEPOSIT,
      tags: [Tag.BUILDING],
      cost: 4,

      // "Ore" on the printed card is represented with the generic fan-card resource cube,
      // matching precedent (e.g. Ancient Shipyards) for a mined, card-hosted resource with
      // no dedicated icon of its own.
      resourceType: CardResource.RESOURCE_CUBE,

      behavior: {
        addResources: 6,
      },

      action: {
        or: {
          behaviors: [
            {
              title: 'Spend 2 ore from this card to get 2 steel',
              spend: {resourcesHere: 2},
              stock: {steel: 2},
            },
            {
              title: 'Spend 2 ore from this card to get 2 titanium',
              spend: {resourcesHere: 2},
              stock: {titanium: 2},
            },
          ],
        },
      },

      metadata: {
        cardNumber: 'Im119',
        renderData: CardRenderer.builder((b) => {
          b.resource(CardResource.RESOURCE_CUBE, 2).arrow().steel(2).nbsp.or().br;
          b.resource(CardResource.RESOURCE_CUBE, 2).arrow().titanium(2).br;
          b.plainText('Add 6 ore to this card.', /** parens */ true);
        }),
        description: 'Action: spend 2 ore from this card to get 2 steel or 2 titanium.',
      },
    });
  }
}
