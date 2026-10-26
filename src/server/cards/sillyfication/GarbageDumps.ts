import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {TileType} from '../../../common/TileType';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {PlaceTile} from '../../deferredActions/PlaceTile';
import {CardRenderer} from '../render/CardRenderer';
import {all} from '../Options';

export class GarbageDumps extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.GARBAGE_DUMPS,
      tags: [Tag.BUILDING, Tag.MARS],
      cost: 9,
      victoryPoints: -1,

      metadata: {
        cardNumber: 'X32',
        renderData: CardRenderer.builder((b) => {
          b.tile(TileType.GARBAGE_DUMP, true).br;
          b.minus().tr(1, {all}).asterix();
        }),
        description: 'Place this tile. Every opponent with a tile adjacent to it loses 1 TR.',
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    const game = player.game;
    game.defer(new PlaceTile(player, {
      tile: {tileType: TileType.GARBAGE_DUMP, card: this.name},
      on: 'land',
      title: 'Select space for Garbage Dumps',
    })).andThen((space) => {
      const adjacentPlayers = new Set<IPlayer>();
      game.board.getAdjacentSpaces(space).forEach((adjacent) => {
        if (adjacent.tile !== undefined && adjacent.player !== undefined && adjacent.player.id !== player.id) {
          adjacentPlayers.add(adjacent.player);
        }
      });
      for (const target of adjacentPlayers) {
        target.decreaseTerraformRating(1, {log: true});
      }
      return undefined;
    });
    return undefined;
  }
}
