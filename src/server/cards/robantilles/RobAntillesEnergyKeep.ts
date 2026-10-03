import {CardName} from '../../../common/cards/CardName';
import {IPlayer} from '../../IPlayer';
import {SelectAmount} from '../../inputs/SelectAmount';

/**
 * Smes Technology and Tharsis Pumping Hub each let their owner keep some energy at the
 * end of the generation instead of it all converting to heat. This computes the combined
 * cap across both cards (a player could conceivably own both) and defers the keep/convert
 * choice during the production phase.
 *
 * This is wired into `Player.runProductionPhase`, mirroring how Supercapacitors (which makes
 * the conversion optional with no cap) is special-cased there.
 */
export function getEnergyKeepCap(player: IPlayer): number {
  let cap = 0;
  if (player.playedCards.has(CardName.SMES_TECHNOLOGY)) {
    cap += 3;
  }
  if (player.playedCards.has(CardName.THARSIS_PUMPING_HUB)) {
    cap += 4;
  }
  return cap;
}

/** Defers a choice of how much of `player`'s energy (up to `cap`) to keep instead of converting to heat. */
export function deferEnergyKeep(player: IPlayer, cap: number): void {
  const keepable = Math.min(cap, player.energy);
  if (keepable <= 0) {
    player.heat += player.energy;
    player.energy = 0;
    player.finishProductionPhase();
    return;
  }
  player.defer(
    new SelectAmount('Select amount of energy to keep instead of converting to heat', 'OK', 0, keepable, true)
      .andThen((keep) => {
        const converted = player.energy - keep;
        player.heat += converted;
        player.energy = keep;
        player.game.log('${0} kept ${1} unit(s) of energy instead of converting it to heat', (b) => b.player(player).number(keep));
        player.finishProductionPhase();
        return undefined;
      }));
}
