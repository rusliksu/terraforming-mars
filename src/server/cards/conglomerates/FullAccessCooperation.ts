import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class FullAccessCooperation extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.FULL_ACCESS_COOPERATION,
      cost: 11,

      metadata: {
        cardNumber: 'CG2',
        renderData: CardRenderer.builder((b) => {
          b.teammateArrow().asterix().colon().corporation().br;
          b.arrow().asterix().colon().megacredits(2);
        }),
        description: 'Facility Access can also use your corporation\'s action. When another player uses one of your action cards (including your corporation, with this card in play), gain 2 M€.',
      },
    });
  }
}
