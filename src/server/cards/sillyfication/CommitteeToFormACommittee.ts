import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {ActionCard} from '../ActionCard';
import {IProjectCard} from '../IProjectCard';

export class CommitteeToFormACommittee extends ActionCard implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.COMMITTEE_TO_FORM_A_COMMITTEE,
      tags: [Tag.EARTH],
      cost: 3,

      action: {
        stock: {megacredits: 1},
      },

      metadata: {
        cardNumber: 'X19',
        renderData: CardRenderer.builder((b) => {
          b.action('Gain 1 M€.', (eb) => {
            eb.empty().startAction.megacredits(1);
          });
        }),
      },
    });
  }
}
