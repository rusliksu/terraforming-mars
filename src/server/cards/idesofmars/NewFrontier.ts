import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {ColoniesHandler} from '../../colonies/ColoniesHandler';
import {CardRenderer} from '../render/CardRenderer';

export class NewFrontier extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.NEW_FRONTIER,
      tags: [Tag.SPACE],
      cost: 21,

      metadata: {
        cardNumber: 'Im118',
        renderData: CardRenderer.builder((b) => {
          b.colonyTile().colonies(1);
        }),
        description: 'Requires that all colony tiles in play have at least 1 colony. Add a colony tile of your choice and place 1 colony on it.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    const game = player.game;
    if (!game.gameOptions.coloniesExtension || game.colonies.length === 0) {
      return false;
    }
    return game.colonies.every((colony) => colony.colonies.length > 0);
  }

  public override bespokePlay(player: IPlayer) {
    ColoniesHandler.addColonyTile(player, {
      title: 'Select colony tile to add',
      cb: (colony) => {
        if (colony.isActive) {
          colony.addColony(player);
        }
      },
    });
    return undefined;
  }
}
