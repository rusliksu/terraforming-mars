import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {ActionCard} from '../ActionCard';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {IStandardProjectCard} from '../IStandardProjectCard';
import {TileType} from '../../../common/TileType';
import {CardRenderer} from '../render/CardRenderer';
import {Size} from '../../../common/cards/render/Size';

export class HeavyMachinery extends ActionCard implements IProjectCard, IActionCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.HEAVY_MACHINERY,
      tags: [],
      cost: 6,

      requirements: {tag: Tag.BUILDING},

      action: {
        spend: {megacredits: 11},
        production: {titanium: 1},
      },

      // Cards with a City tag place a city tile, by the same near-universal convention
      // ArchitecturalContracts (corporateBetterments) relies on for its own city-tag discount.
      cardDiscount: {tag: Tag.CITY, amount: 1},

      metadata: {
        cardNumber: 'H56',
        renderData: CardRenderer.builder((b) => {
          b.action('Pay 11 M€ to increase your titanium production 1 step.', (ab) => {
            ab.megacredits(11).startAction.production((pb) => pb.titanium(1));
          }).br;
          b.text('Actions that let you place a City tile or a Special tile cost 1 M€ less.', {size: Size.SMALL});
        }),
        description: 'Requires that you have a building tag.',
      },
    });
  }

  // Beyond the City-tag discount above (which covers the near-universal "City tag means it
  // places a city tile" convention, including the City standard project below), there is no tag
  // or other static signal marking "this card places a Special tile" for the many cards that
  // place one imperatively (Mining Rights, Natural Preserve, Nuclear Zone, etc. all build their
  // tile placement in bespokePlay, not via the declarative `behavior.tile` config). This discount
  // fires for any card using that declarative form (currently rare: e.g. Luna Mining Hub, Luna
  // Train Station) and for any future card that adopts it, but can't reach the many existing
  // imperative special-tile cards without auditing each one individually -- a real, disclosed
  // scope limit rather than a silent approximation.
  public override getCardDiscount(player: IPlayer, card: IProjectCard): number {
    let discount = super.getCardDiscount(player, card);
    const tileType = card.behavior?.tile?.type;
    if (tileType !== undefined && tileType !== TileType.OCEAN && tileType !== TileType.GREENERY && tileType !== TileType.CITY) {
      discount += 1;
    }
    return discount;
  }

  public getStandardProjectDiscount(_player: IPlayer, card: IStandardProjectCard): number {
    if (card.name === CardName.CITY_STANDARD_PROJECT) {
      return 1;
    }
    return 0;
  }
}
