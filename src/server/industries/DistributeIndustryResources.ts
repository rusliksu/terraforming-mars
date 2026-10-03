import {IPlayer} from '../IPlayer';
import {Space} from '../boards/Space';
import {DeferredAction} from '../deferredActions/DeferredAction';
import {Priority} from '../deferredActions/Priority';
import {SelectSpace} from '../inputs/SelectSpace';
import {PlayerInput} from '../PlayerInput';
import {Resource} from '../../common/Resource';
import {SpaceBonus} from '../../common/boards/SpaceBonus';

const RESOURCE_TO_SPACE_BONUS: Record<Resource, SpaceBonus> = {
  [Resource.MEGACREDITS]: SpaceBonus.MEGACREDITS,
  [Resource.STEEL]: SpaceBonus.STEEL,
  [Resource.TITANIUM]: SpaceBonus.TITANIUM,
  [Resource.PLANTS]: SpaceBonus.PLANT,
  [Resource.ENERGY]: SpaceBonus.ENERGY,
  [Resource.HEAT]: SpaceBonus.HEAT,
};

const RESOURCE_LABEL: Record<Resource, string> = {
  [Resource.MEGACREDITS]: 'M€',
  [Resource.STEEL]: 'steel',
  [Resource.TITANIUM]: 'titanium',
  [Resource.PLANTS]: 'plants',
  [Resource.ENERGY]: 'energy',
  [Resource.HEAT]: 'heat',
};

/**
 * Industries (fan expansion): after placing an industry tile, its fixed resource count is
 * distributed across two different spaces adjacent to it -- except the Wild tile's single
 * unit, which just goes to one space, since an indivisible 1 can't satisfy "two areas, at
 * least one each." The split between the two spaces is automatic (as even as `count` allows)
 * -- the rules only say which two spaces, never that the player also controls how much goes
 * to each.
 *
 * A space that already has a tile immediately grants its resources to that tile's owner
 * (matching "the owner of those tiles will collect the resources"). An empty space just
 * receives a `SpaceBonus`, collected automatically -- by whoever places a tile there, not
 * necessarily this player -- the next time any tile lands there (`Game.grantSpaceBonuses`),
 * the same mechanism `idesofmars/PreciousMetalAsteroid.ts` uses for its own silver-cube bonus.
 */
export class DistributeIndustryResources extends DeferredAction<void> {
  private pool: ReadonlyArray<Space>;

  constructor(
    player: IPlayer,
    private resource: Resource,
    private count: number,
    origin: Space,
  ) {
    super(player, Priority.DEFAULT);
    this.pool = player.game.board.getAdjacentSpaces(origin);
  }

  public execute(): PlayerInput | undefined {
    if (this.count <= 0 || this.pool.length === 0) {
      this.cb(undefined);
      return undefined;
    }
    if (this.count === 1) {
      return this.pick(this.pool, 1, () => this.cb(undefined));
    }
    const firstAmount = Math.ceil(this.count / 2);
    const secondAmount = this.count - firstAmount;
    return this.pick(this.pool, firstAmount, (firstSpace) => {
      const remaining = this.pool.filter((space) => space.id !== firstSpace.id);
      if (remaining.length === 0) {
        this.cb(undefined);
        return;
      }
      const next = this.pick(remaining, secondAmount, () => this.cb(undefined));
      if (next !== undefined) {
        this.player.defer(next);
      }
    });
  }

  private pick(spaces: ReadonlyArray<Space>, amount: number, onDone: (space: Space) => void): PlayerInput | undefined {
    return new SelectSpace(`Select a space to receive ${amount} ${RESOURCE_LABEL[this.resource]}`, spaces)
      .andThen((space) => {
        this.grant(space, amount);
        onDone(space);
        return undefined;
      });
  }

  private grant(space: Space, amount: number): void {
    const owner = space.player;
    if (owner !== undefined) {
      owner.stock.add(this.resource, amount, {log: false});
      this.player.game.log('${0} gained ${1} ${2} from ${3}\'s industry tile', (b) =>
        b.player(owner).number(amount).string(RESOURCE_LABEL[this.resource]).player(this.player));
    } else {
      const bonus = RESOURCE_TO_SPACE_BONUS[this.resource];
      for (let i = 0; i < amount; i++) {
        space.bonus.push(bonus);
      }
      this.player.game.log('${0} placed ${1} ${2} on an empty area, to be collected by whoever tiles there', (b) =>
        b.player(this.player).number(amount).string(RESOURCE_LABEL[this.resource]));
    }
  }
}
