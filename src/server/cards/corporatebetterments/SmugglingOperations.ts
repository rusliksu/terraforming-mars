import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {SelectColony} from '../../inputs/SelectColony';
import {IColony} from '../../colonies/IColony';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class SmugglingOperations extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.SMUGGLING_OPERATIONS,
      tags: [Tag.SPACE],
      cost: 12,

      requirements: {colonies: 1, all},

      metadata: {
        cardNumber: 'CB52',
        renderData: CardRenderer.builder((b) => b.trade().asterix().colon().colonies(1).asterix()),
        description: 'Requires at least 1 colony in play. Get the trade bonus and the colony bonus from a colony of your choice. ' +
          'Only you get these resources, and the colony track does not change.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const activeColonies = player.game.colonies.filter((colony) => colony.isActive);
    return new SelectColony('Select colony to raid', 'Raid', activeColonies)
      .andThen((colony: IColony) => {
        colony.trade(player, {selfishTrade: true, usesTradeFleet: false, decreaseTrackAfterTrade: false});
        return undefined;
      });
  }
}
