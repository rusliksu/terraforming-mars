import {IProjectCard} from '@/server/cards/IProjectCard';
import {Card} from '@/server/cards/Card';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {IPlayer} from '@/server/IPlayer';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {Resource} from '@/common/Resource';
import {all} from '@/server/cards/Options';

export class JovianBeltMiningOperations extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.JOVIAN_BELT_MINING_OPERATIONS,
      tags: [Tag.JOVIAN, Tag.SPACE],
      cost: 19,
      victoryPoints: 2,

      behavior: {
        production: {titanium: 2},
      },

      metadata: {
        cardNumber: 'CB10',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.titanium(2)).br;
          b.production((pb) => pb.titanium(1, {all})).asterix();
        }),
        description: 'Increase your titanium production 2 steps. Each other player increases their titanium production 1 step.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    for (const p of game.players) {
      if (p.id !== player.id) {
        p.production.add(Resource.TITANIUM, 1, {log: true, from: {card: this}});
      }
    }
    return undefined;
  }
}
