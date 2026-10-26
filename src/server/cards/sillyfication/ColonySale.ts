import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {NEUTRAL_COLONY_OWNER} from '../../../common/Types';
import {SelectColony} from '../../inputs/SelectColony';

export class ColonySale extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.COLONY_SALE,
      cost: 5,

      requirements: {colonies: 1},
      metadata: {
        cardNumber: 'X54',
        renderData: CardRenderer.builder((b) => {
          b.colonyTile().arrow().megacredits(17);
        }),
        description: 'Requires that you have a colony. Sell one of your colonies for 17 M€. The tile keeps the spot occupied - a neutral colony takes it, and it does nothing.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const ownedColonies = player.game.colonies.filter((colony) => colony.colonies.includes(player.id));
    return new SelectColony('Select a colony to sell', 'Sell colony', ownedColonies)
      .andThen((colony) => {
        const idx = colony.colonies.indexOf(player.id);
        if (idx !== -1) {
          colony.colonies[idx] = NEUTRAL_COLONY_OWNER;
        }
        player.game.log('${0} sold their colony on ${1} - a neutral colony takes the spot', (b) => b.player(player).colony(colony));
        player.stock.add(Resource.MEGACREDITS, 17, {log: true, from: {card: this}});
        return undefined;
      });
  }
}
