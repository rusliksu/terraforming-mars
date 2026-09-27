import {DeferredAction} from './DeferredAction';
import {IPlayer} from '../IPlayer';
import {Priority} from './Priority';
import {Resource} from '../../common/Resource';
import {SelectAmount} from '../inputs/SelectAmount';
import {message} from '../logs/MessageBuilder';
import {From} from '../logs/From';

/** Sistemas Seebeck: energy and heat production are one combined pool for its owner, so
 * whenever some other effect would reduce either, the owner chooses how to split the loss
 * between the two instead of it landing entirely on whichever one the source specified. */
export class RebalanceSeebeckProductionLoss extends DeferredAction {
  constructor(
    player: IPlayer,
    private originalResource: typeof Resource.ENERGY | typeof Resource.HEAT,
    private amount: number,
    private options?: {log: boolean, from?: From, stealing?: boolean},
  ) {
    super(player, Priority.DEFAULT);
  }

  public execute() {
    const player = this.player;
    const otherResource = this.originalResource === Resource.ENERGY ? Resource.HEAT : Resource.ENERGY;

    // The combined pool is the real ceiling - Seebeck lets the loss dip into whichever
    // side has room, not just the one the source effect named.
    const lost = Math.min(this.amount, player.production.get(this.originalResource) + player.production.get(otherResource));
    if (lost <= 0) {
      return undefined;
    }

    const maxFromOriginal = Math.min(lost, player.production.get(this.originalResource));
    const minFromOriginal = Math.max(0, lost - player.production.get(otherResource));

    const applySplit = (fromOriginal: number) => {
      const fromOther = lost - fromOriginal;
      if (fromOriginal > 0) {
        player.production.add(this.originalResource, -fromOriginal, {...this.options, log: true, skipSeebeckRedistribution: true});
      }
      if (fromOther > 0) {
        player.production.add(otherResource, -fromOther, {...this.options, log: true, skipSeebeckRedistribution: true});
      }
    };

    if (maxFromOriginal <= minFromOriginal) {
      applySplit(minFromOriginal);
      return undefined;
    }

    return new SelectAmount(
      message('Your ${0} production would be reduced by ${1} - choose how much of that to take from ${0} (the rest comes from ${2})',
        (b) => b.string(this.originalResource).number(lost).string(otherResource)),
      'Confirm',
      minFromOriginal,
      maxFromOriginal)
      .andThen((fromOriginal) => {
        applySplit(fromOriginal);
        return undefined;
      });
  }
}
