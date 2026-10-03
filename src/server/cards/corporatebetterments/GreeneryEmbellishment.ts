import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {CardRenderer} from '../render/CardRenderer';

export class GreeneryEmbellishment extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.GREENERY_EMBELLISHMENT,
      tags: [Tag.PLANT],
      cost: 18,

      requirements: {tag: Tag.PLANT, count: 5},
      victoryPoints: 2,

      metadata: {
        cardNumber: 'B13',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(2)).nbsp.city().slash().greenery();
        }),
        description: 'Requires that you have 5 plant tags. Increase your M€ production 2 steps ' +
          'for each city in play ADJACENT TO AT LEAST ONE greenery.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const board = player.game.board;
    const greeneries = board.getGreeneries();
    const count = board.getCities().filter(
      (citySpace) => board.getAdjacentSpaces(citySpace).some((adjacent) => greeneries.includes(adjacent)),
    ).length;

    if (count > 0) {
      player.production.add(Resource.MEGACREDITS, count * 2, {log: true});
    }
    return undefined;
  }
}
