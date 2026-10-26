import {IProjectCard} from '../IProjectCard';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {IStandardProjectCard} from '../IStandardProjectCard';
import {TileType} from '../../../common/TileType';
import {CardRenderer} from '../render/CardRenderer';

/** The three standard projects that place a tile on Mars. */
const MARS_TILE_STANDARD_PROJECTS: ReadonlySet<CardName> = new Set([
  CardName.CITY_STANDARD_PROJECT,
  CardName.GREENERY_STANDARD_PROJECT,
  CardName.AQUIFER_STANDARD_PROJECT,
]);

/**
 * Tile types this card recognizes as "a tile placed on Mars" for its card discount -- the base
 * Mars tiles plus the common Mars-board special tiles, explicitly excluding Moon tiles, hazard
 * tiles, and other off-Mars-board tile types.
 */
const MARS_TILE_TYPES: ReadonlySet<TileType> = new Set([
  TileType.CITY, TileType.OCEAN, TileType.GREENERY,
  TileType.CAPITAL, TileType.COMMERCIAL_DISTRICT, TileType.ECOLOGICAL_ZONE, TileType.INDUSTRIAL_CENTER,
  TileType.LAVA_FLOWS, TileType.MINING_AREA, TileType.MINING_RIGHTS, TileType.MOHOLE_AREA,
  TileType.NATURAL_PRESERVE, TileType.NUCLEAR_ZONE, TileType.RESTRICTED_AREA, TileType.GREAT_DAM,
  TileType.MAGNETIC_FIELD_GENERATORS, TileType.BIOFERTILIZER_FACILITY, TileType.METALLIC_ASTEROID,
  TileType.SOLAR_FARM, TileType.OCEAN_CITY, TileType.OCEAN_FARM, TileType.OCEAN_SANCTUARY,
  TileType.WETLANDS, TileType.RED_CITY, TileType.NEW_HOLLAND, TileType.INVAK_CITY,
]);

export class MartianInfrastructures extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MARTIAN_INFRASTRUCTURES,
      tags: [],
      cost: 6,

      behavior: {
        production: {energy: -1},
      },

      metadata: {
        cardNumber: 'IM129',
        renderData: CardRenderer.builder((b) => {
          b.effect('Cards and standard projects that place a tile on Mars cost you 2 M€ less.', (eb) => {
            eb.city().startEffect.megacredits(-2);
          });
          b.br;
          b.production((pb) => pb.minus().energy(1));
        }),
        description: 'Decrease your energy production 1 step.',
      },
    });
  }

  public override getCardDiscount(_player: IPlayer, card: IProjectCard): number {
    return card.tilesBuilt.some((t) => MARS_TILE_TYPES.has(t)) ? 2 : 0;
  }

  public getStandardProjectDiscount(_player: IPlayer, project: IStandardProjectCard): number {
    return MARS_TILE_STANDARD_PROJECTS.has(project.name) ? 2 : 0;
  }
}
