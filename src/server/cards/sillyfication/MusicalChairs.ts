import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {IActionCard} from '../ICard';
import {IProjectCard} from '../IProjectCard';
import {IPlayer} from '../../IPlayer';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

/** Blue card: spend 1 energy to randomly hand the first-player marker to any player,
 * including the current one (so it can land back where it already was). */
export class MusicalChairs extends Card implements IActionCard, IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.MUSICAL_CHAIRS,
      cost: 4,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'X73',
        renderData: CardRenderer.builder((b) => {
          b.action('Spend 1 energy to make a random player the new first player.', (eb) => {
            eb.energy(1).startAction.firstPlayer().asterix();
          });
        }),
      },
    });
  }

  public canAct(player: IPlayer): boolean {
    return player.availableEnergy() >= 1 && player.game.players.length >= 2;
  }

  public action(player: IPlayer) {
    const game = player.game;
    return player.spendEnergy(1, () => {
      const next = game.players[game.rng.nextInt(game.players.length)];
      game.log('${0} used ${1} to shuffle the turn order', (b) => b.player(player).card(this));
      game.overrideFirstPlayer(next);
      return undefined;
    });
  }
}
