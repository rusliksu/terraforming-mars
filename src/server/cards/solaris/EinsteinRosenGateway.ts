import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {SelectColony} from '../../inputs/SelectColony';
import {ColoniesHandler} from '../../colonies/ColoniesHandler';
import {CardRenderer} from '../render/CardRenderer';

export class EinsteinRosenGateway extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.EINSTEIN_ROSEN_GATEWAY,
      tags: [Tag.JOVIAN, Tag.SPACE, Tag.GALACTIC],
      cost: 27,

      requirements: {colonies: 3},
      victoryPoints: {tag: Tag.GALACTIC, each: 3},

      metadata: {
        cardNumber: 'SL05',
        renderData: CardRenderer.builder((b) => {
          b.action('Trade for free.', (eb) => {
            eb.empty().startAction.trade();
          }).br;
          b.vpText('3 VP for each Galactic tag you have, including this.');
        }),
        description: 'Requires that you have 3 colonies.',
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    if (player.game.tradeEmbargo === true) {
      return false;
    }
    return ColoniesHandler.tradeableColonies(player.game).length > 0;
  }

  public action(player: IPlayer) {
    const tradeableColonies = ColoniesHandler.tradeableColonies(player.game);
    return new SelectColony('Select colony tile to trade with for free', 'Trade', tradeableColonies)
      .andThen((colony) => {
        colony.trade(player);
        return undefined;
      });
  }
}
