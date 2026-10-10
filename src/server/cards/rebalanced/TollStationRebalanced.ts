import {CardName} from '@/common/cards/CardName';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {Resource} from '@/common/Resource';
import {IPlayer} from '@/server/IPlayer';
import {Card} from '@/server/cards/Card';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {all} from '@/server/cards/Options';

export class TollStationRebalanced extends Card {
  constructor() {
    super({
      name: CardName.TOLL_STATION_REBALANCED,
      type: CardType.AUTOMATED,
      tags: [Tag.SPACE],
      cost: 12,
      metadata: {
        cardNumber: '099',
        description: 'Increase your M€ production 1 step for each space tag of the OPPONENT who has the most space tags.',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(1).slash().tag(Tag.SPACE, {all}).asterix());
        }),
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const count = Math.max(0, ...player.opponents.map((opponent) => opponent.tags.count(Tag.SPACE, 'raw')));
    player.production.add(Resource.MEGACREDITS, count, {log: true, from: {card: this}});
    return undefined;
  }
}
