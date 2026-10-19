import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {Board} from '../../boards/Board';
import {CardRenderer} from '../render/CardRenderer';

export class Pipes extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.PIPES,
      tags: [Tag.BUILDING],
      cost: 6,

      metadata: {
        cardNumber: 'B22',
        renderData: CardRenderer.builder((b) => {
          b.megacredits(1).slash().oceans(1);
        }),
        description: 'Get 1 M€ for each of your tiles ADJACENT TO at least one ocean.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const board = player.game.board;
    const count = board.spaces.filter((space) =>
      space.tile !== undefined &&
      space.player === player &&
      board.getAdjacentSpaces(space).some((adjacent) => Board.isOceanSpace(adjacent)),
    ).length;

    if (count > 0) {
      player.stock.add(Resource.MEGACREDITS, count, {log: true});
    }
    return undefined;
  }
}
