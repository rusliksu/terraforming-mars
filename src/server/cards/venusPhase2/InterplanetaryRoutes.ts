import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {CardRenderer} from '../render/CardRenderer';

export class InterplanetaryRoutes extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.INTERPLANETARY_ROUTES,
      tags: [Tag.JOVIAN],
      cost: 10,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'V70',
        renderData: CardRenderer.builder((b) => {
          b.plainText('Increase the colony marker on every colony tile where you have at least 1 colony.', true);
        }),
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.colonies.some((colony) => colony.colonies.includes(player.id));
  }

  public override bespokePlay(player: IPlayer) {
    for (const colony of player.game.colonies) {
      if (colony.colonies.includes(player.id)) {
        colony.increaseTrack();
      }
    }
    return undefined;
  }
}
