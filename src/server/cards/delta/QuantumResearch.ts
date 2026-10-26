import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class QuantumResearch extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.QUANTUM_RESEARCH,
      tags: [Tag.SCIENCE],
      cost: 9,
      victoryPoints: 1,

      requirements: {tag: Tag.SCIENCE, count: 3},

      metadata: {
        cardNumber: 'DP03',
        renderData: CardRenderer.builder((b) => {
          b.effect('When you buy a card to hand, you pay 1 M€ less for it.', (eb) => {
            eb.cards(1).startEffect.megacredits(-1);
          });
        }),
        description: 'Requires 3 science tags.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    player.cardCost = Math.max(0, player.cardCost - 1);
    return undefined;
  }
}
