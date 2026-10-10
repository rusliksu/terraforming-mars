import {IProjectCard} from '@/server/cards/IProjectCard';
import {Tag} from '@/common/cards/Tag';
import {Card} from '@/server/cards/Card';
import {CardType} from '@/common/cards/CardType';
import {CardName} from '@/common/cards/CardName';
import {TileType} from '@/common/TileType';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {all, digit} from '@/server/cards/Options';
import {AdjacencyBonus} from '@/server/ares/AdjacencyBonus';

export class DeimosDownPromoRebalanced extends Card implements IProjectCard {
  constructor(
    name = CardName.DEIMOS_DOWN_PROMO_REBALANCED,
    adjacencyBonus: AdjacencyBonus | undefined = undefined,
    metadata = {
      cardNumber: 'X31',
      renderData: CardRenderer.builder((b) => {
        b.temperature(3).nbsp.tile(TileType.DEIMOS_DOWN, true).asterix().br;
        b.steel(4, {digit}).nbsp.minus().plants(-8, {all});
      }),
      description: 'Raise temperature 3 steps and gain 4 steel. Place this tile ADJACENT TO no city tile. Remove up to 8 plants from any player.',
    },
  ) {
    super({
      type: CardType.EVENT,
      name,
      tags: [Tag.SPACE],
      cost: 35,
      metadata,
      behavior: {
        stock: {steel: 4},
        global: {temperature: 3},
        removeAnyPlants: 8,
        tile: {
          type: TileType.DEIMOS_DOWN,
          on: 'away-from-cities',
          adjacencyBonus: adjacencyBonus,
        },
      },
    });
  }
}
