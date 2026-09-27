import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class IdeaBudgeting extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.IDEA_BUDGETING,
      tags: [Tag.EARTH],
      cost: 13,

      behavior: {
        production: {megacredits: 5},
      },

      metadata: {
        cardNumber: 'X78',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(5)).br;
          b.minus().cards(1).asterix();
        }),
        description: 'Increase your M€ production 5 steps. In your next research phase, you may keep at most 1 card.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    player.nextResearchKeepMax = 1;
    return undefined;
  }
}
