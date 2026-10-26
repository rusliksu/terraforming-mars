import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class MausoleumAtHellas extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MAUSOLEUM_AT_HELLAS,
      tags: [Tag.MARS],
      cost: 16,

      resourceType: CardResource.RELIC,
      victoryPoints: {resourcesHere: {}},

      action: {
        spend: {cards: 1},
        addResources: 1,
      },

      metadata: {
        cardNumber: 'H28',
        renderData: CardRenderer.builder((b) => {
          b.action('Discard a card from your hand to add 1 relic resource to this card.', (eb) => {
            eb.minus().cards(1).startAction.resource(CardResource.RELIC);
          }).br;
          b.vpText('1 VP for each relic resource on this card.');
        }),
      },
    });
  }
}
