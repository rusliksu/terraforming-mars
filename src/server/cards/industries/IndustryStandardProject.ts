import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {Resource} from '../../../common/Resource';
import {Tag} from '../../../common/cards/Tag';
import {TileType} from '../../../common/TileType';
import {StandardProjectCard} from '../StandardProjectCard';
import {PlaceTile} from '../../deferredActions/PlaceTile';
import {DistributeIndustryResources} from '../../industries/DistributeIndustryResources';
import {CardRenderer} from '../render/CardRenderer';

export const RESOURCE_LABEL: Record<Resource, string> = {
  [Resource.MEGACREDITS]: 'M€',
  [Resource.STEEL]: 'steel',
  [Resource.TITANIUM]: 'titanium',
  [Resource.PLANTS]: 'plants',
  [Resource.ENERGY]: 'energy',
  [Resource.HEAT]: 'heat',
};

/**
 * Industries (fan expansion): a standard project family, one per resource flavor. Placing
 * one puts a new industry tile on any empty land space, raises the matching production 1
 * step, and distributes that same resource across two spaces adjacent to it (see
 * `DistributeIndustryResources`). Eligibility is tag-gated rather than a fixed unlock: a
 * player needs more `Tag.POWER` cards in their tableau than industry tiles they've already
 * placed (any flavor, `player.industryTilesPlaced`, shared across all 7 subclasses and
 * capped at 13 total).
 */
export abstract class IndustryStandardProject extends StandardProjectCard {
  /** `resource` is `undefined` for the Wild flavor, which lets the player choose at resolution time. */
  protected constructor(
    name: CardName,
    cost: number,
    protected resource: Resource | undefined,
    protected tileType: TileType,
    protected distributionCount: number,
  ) {
    super({
      name,
      cost,
      metadata: {
        cardNumber: '',
        renderData: CardRenderer.builder((b) => {
          const label = resource === undefined ? 'a resource of your choice' : RESOURCE_LABEL[resource];
          b.standardProject(
            `Spend ${cost} M€ to place an industry tile, raise your ${label} production 1 step, ` +
            `and distribute ${distributionCount} ${label} across two spaces adjacent to it.`,
            (eb) => {
              eb.megacredits(cost).startAction.tile(tileType).production((pb) => {
                switch (resource) {
                case Resource.MEGACREDITS: pb.megacredits(1); break;
                case Resource.STEEL: pb.steel(1); break;
                case Resource.TITANIUM: pb.titanium(1); break;
                case Resource.PLANTS: pb.plants(1); break;
                case Resource.ENERGY: pb.energy(1); break;
                case Resource.HEAT: pb.heat(1); break;
                default: pb.wild(1); break;
                }
              });
            },
          );
        }),
      },
    });
  }

  public override canAct(player: IPlayer): boolean {
    if (player.industryTilesPlaced >= 13) {
      return false;
    }
    if (player.tags.count(Tag.POWER) <= player.industryTilesPlaced) {
      return false;
    }
    if (player.game.board.getAvailableSpacesOnLand(player, this.canPlayOptions(player)).length === 0) {
      return false;
    }
    return super.canAct(player);
  }

  protected actionEssence(player: IPlayer): void {
    if (this.resource === undefined) {
      throw new Error('Wild industry standard projects must override actionEssence');
    }
    placeIndustryTile(player, this.resource, this.tileType, this.distributionCount, this.name);
  }
}

/** Shared with `WildIndustryStandardProject`, which resolves its own resource choice before delegating here. */
export function placeIndustryTile(player: IPlayer, resource: Resource, tileType: TileType, distributionCount: number, cardName: CardName): void {
  player.game.defer(new PlaceTile(player, {
    tile: {tileType, card: cardName},
    on: () => player.game.board.getAvailableSpacesOnLand(player),
    title: 'Select space for industry tile',
  })).andThen((space) => {
    player.production.add(resource, 1);
    player.industryTilesPlaced++;
    player.game.defer(new DistributeIndustryResources(player, resource, distributionCount, space));
  });
}
