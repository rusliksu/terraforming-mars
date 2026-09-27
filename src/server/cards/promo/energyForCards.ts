import {SelectAmount} from '@/server/inputs/SelectAmount';
import {IPlayer} from '@/server/IPlayer';

export function canSpendEnergyForCards(player: IPlayer) {
  return player.availableEnergy() > 0 && player.game.projectDeck.canDraw(1);
}

export function spendEnergyForCards(player: IPlayer) {
  const max = Math.min(player.availableEnergy(), player.game.projectDeck.size());
  return new SelectAmount('Select amount of energy to spend', 'OK', 1, max)
    .andThen((amount) => {
      return player.spendEnergy(amount, () => {
        player.game.log('${0} spent ${1} energy', (b) => b.player(player).number(amount));
        if (amount === 1) {
          player.drawCard();
          return undefined;
        }
        player.drawCardKeepSome(amount, {keepMax: 1});
        return undefined;
      });
    });
}
