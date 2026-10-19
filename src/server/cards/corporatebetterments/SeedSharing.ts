import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class SeedSharing extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.SEED_SHARING,
      tags: [Tag.PLANT, Tag.SCIENCE],
      cost: 17,

      behavior: {
        production: {plants: 2},
      },

      metadata: {
        cardNumber: 'CB33',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.plants(2)).br;
          b.plants(2, {all});
        }),
        description: 'Requires that a player has plant production. Increase your plant production 2 steps. Every player gains 2 plants.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.players.some((p) => p.production.plants > 0);
  }

  public override bespokePlay(player: IPlayer) {
    for (const p of player.game.players) {
      p.stock.add(Resource.PLANTS, 2, {log: true});
    }
    return undefined;
  }
}
