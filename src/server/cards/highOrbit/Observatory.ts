import {IProjectCard} from '../IProjectCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {SilverActionCard} from './SilverActionCard';

export class Observatory extends SilverActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.OBSERVATORY,
      cost: 2,

      resourceType: CardResource.DATA,
      victoryPoints: {resourcesHere: {}, per: 3},

      action: {
        spend: {cards: 1},
        addResources: 1,
      },

      metadata: {
        cardNumber: 'HO03',
        renderData: CardRenderer.builder((b) => {
          b.action('Discard a card from your hand to add 1 data resource to this card.', (eb) => {
            eb.minus().cards(1).startAction.resource(CardResource.DATA);
          }).br;
          b.vpText('1 VP for every 3 data on this card.');
        }),
      },
    });
  }
}
