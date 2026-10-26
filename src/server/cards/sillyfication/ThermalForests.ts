import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {IPlayer} from '../../IPlayer';
import {Board} from '../../boards/Board';

export class ThermalForests extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.THERMAL_FORESTS,
      tags: [Tag.PLANT],
      cost: 10,

      requirements: {greeneries: 2, adjacent: true},

      behavior: {
        production: {heat: 2, plants: 1},
        stock: {heat: 3},
      },

      metadata: {
        cardNumber: 'X03',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.heat(2).plants(1)).heat(3);
        }),
        description: 'Requires 2 greeneries on Mars ADJACENT to each other. ' +
          'Increase your heat production 2 steps and your plant production 1 step. Gain 3 heat.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    const board = player.game.board;
    return board.spaces.some((space) =>
      Board.isGreenerySpace(space) &&
      board.getAdjacentSpaces(space).some((adjacent) => Board.isGreenerySpace(adjacent)));
  }
}
