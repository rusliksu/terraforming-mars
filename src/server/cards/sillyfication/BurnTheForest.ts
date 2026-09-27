import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {TileType} from '../../../common/TileType';
import {IPlayer} from '../../IPlayer';
import {SelectSpace} from '../../inputs/SelectSpace';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

export class BurnTheForest extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.EVENT,
      name: CardName.BURN_THE_FOREST,
      tags: [Tag.PLANT],
      cost: 13,
      victoryPoints: -1,

      behavior: {
        global: {temperature: 2},
        stock: {heat: 6},
      },

      metadata: {
        cardNumber: 'T11',
        renderData: CardRenderer.builder((b) => {
          b.minus().greenery({withO2: false}).plus().tile(TileType.GARBAGE_DUMP, true).asterix().br;
          b.temperature(2).nbsp.heat(6, {digit});
        }),
        description: 'Remove one of your greenery tiles (does not affect oxygen). Place this tile there instead, ' +
          'gaining the normal placement bonus. Increase temperature 2 steps and gain 6 heat.',
      },
    });
  }

  public override bespokeCanPlay(player: IPlayer): boolean {
    return player.game.board.getGreeneries(player).length > 0;
  }

  public override bespokePlay(player: IPlayer) {
    const greeneries = player.game.board.getGreeneries(player);
    return new SelectSpace('Select a greenery tile to remove', greeneries)
      .andThen((space) => {
        const game = player.game;
        game.removeTile(space.id);
        game.addTile(player, space, {tileType: TileType.GARBAGE_DUMP, card: this.name});
        return undefined;
      });
  }
}
