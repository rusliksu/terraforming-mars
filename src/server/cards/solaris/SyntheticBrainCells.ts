import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardResource} from '../../../common/CardResource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {PartyName} from '../../../common/turmoil/PartyName';

export class SyntheticBrainCells extends ActionCard implements IActionCard, IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.SYNTHETIC_BRAIN_CELLS,
      tags: [Tag.SCIENCE, Tag.MICROBE],
      cost: 13,

      requirements: {party: PartyName.TRANSHUMANISTS},
      resourceType: CardResource.MICROBE,
      victoryPoints: {resourcesHere: {}, per: 2},

      action: {
        spend: {megacredits: 2},
        addResourcesToAnyCard: {type: CardResource.MICROBE, count: 1, mustHaveCard: true},
      },

      metadata: {
        cardNumber: 'SOL14',
        renderData: CardRenderer.builder((b) => {
          b.action('Pay 2 M€ to add 1 microbe to ANY card.', (eb) => {
            eb.megacredits(2).startAction.resource(CardResource.MICROBE, {amount: 1}).asterix();
          }).br;
          b.vpText('1 VP for every 2nd Microbe on this card.');
        }),
        description: 'Requires that Transhumanists are ruling or that you have 2 delegates there.',
      },
    });
  }
}
