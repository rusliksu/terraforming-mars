import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {SelectColony} from '../../inputs/SelectColony';
import {CardRenderer} from '../render/CardRenderer';
import {inplaceRemove} from '../../../common/utils/utils';

const PAYOUT = 12;

export class ColonyScrapping extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.COLONY_SCRAPPING,
      tags: [],
      cost: 4,

      requirements: {colonies: 1},

      metadata: {
        cardNumber: 'Im122',
        renderData: CardRenderer.builder((b) => {
          b.minus().colonies(1).megacredits(PAYOUT);
        }),
        description: `Requires that you own at least 1 colony. Remove 1 of your colonies and get ${PAYOUT} M€.`,
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const ownedColonies = player.game.colonies.filter((colony) => colony.colonies.includes(player.id));
    return new SelectColony('Select a colony to remove', 'Remove colony', ownedColonies)
      .andThen((colony) => {
        inplaceRemove(colony.colonies, player.id);
        player.game.log('${0} removed their colony on ${1}', (b) => b.player(player).colony(colony));
        player.stock.add(Resource.MEGACREDITS, PAYOUT, {log: true, from: {card: this}});
        return undefined;
      });
  }
}
