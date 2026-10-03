import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class MartianHour extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.MARTIAN_HOUR,
      tags: [],
      cost: 0,

      metadata: {
        cardNumber: 'I12',
        renderData: CardRenderer.builder((b) => {
          b.arrow().nbsp.arrow();
        }),
        description: 'Immediately take two more actions.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    player.availableActionsThisRound += 2;
    return undefined;
  }
}
