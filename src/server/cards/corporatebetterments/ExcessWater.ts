import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

export class ExcessWater extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.EXCESS_WATER,
      tags: [],
      cost: 8,

      metadata: {
        cardNumber: 'CB27',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(2).asterix().colon().oceans(1);
        }),
        description: 'Your bonus for placing adjacent to oceans is 2 M€ more.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    player.oceanBonus += 2;
    return undefined;
  }

  public override bespokeOnDiscard(player: IPlayer) {
    player.oceanBonus -= 2;
  }
}
