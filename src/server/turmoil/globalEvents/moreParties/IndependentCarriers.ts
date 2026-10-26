import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IGame} from '../../../IGame';
import {IPlayer} from '../../../IPlayer';
import {IColony} from '../../../colonies/IColony';
import {Turmoil} from '../../Turmoil';
import {SelectColony} from '../../../inputs/SelectColony';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

/**
 * Independent Carriers (More Parties, fan) / "Phaeton Rescue": each player receives the colony
 * bonus from one of their colonies once per influence point they have, then every colony track
 * moves one space to the left (`decreaseTrack`, see Colony.ts). Colony "build" bonuses are a
 * fixed quantity per colony (not track-position-dependent), so it doesn't matter which of these
 * two clauses resolves first; they're independent.
 *
 * When a player owns tiles on more than one colony, they choose which colony pays out (repeated
 * for every influence point) via SelectColony. With exactly one qualifying colony it's applied
 * directly with no choice needed.
 */
export class IndependentCarriers extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.INDEPENDENT_CARRIERS,
      description: 'Each player receives the colony bonus from one of their colonies for every influence they have. Move the markers on all colonies one space to the left.',
      revealedDelegate: PartyName.BUREAUCRATS,
      currentDelegate: PartyName.SPOME,
      renderData: CardRenderer.builder((b) => {
        b.influence({size: Size.SMALL}).colon().text('colony bonus', {size: Size.SMALL}).br;
        b.text('all colony tracks -1', {size: Size.SMALL});
      }),
    });
  }

  public override bespokeResolve(game: IGame) {
    for (const colony of game.colonies) {
      colony.decreaseTrack();
    }
  }

  public override bespokeResolvePlayer(player: IPlayer) {
    const turmoil = Turmoil.getTurmoil(player.game);
    const influence = turmoil.getInfluence(player);
    if (influence <= 0) {
      return;
    }

    const ownedColonies = player.game.colonies.filter(
      (colony) => colony.isActive && colony.colonies.includes(player.id),
    );
    if (ownedColonies.length === 0) {
      return;
    }

    if (ownedColonies.length === 1) {
      this.grantBonuses(player, ownedColonies[0], influence);
      return;
    }

    player.defer(
      new SelectColony(
        'Select colony to receive its bonus (once for each influence you have)',
        'Select',
        ownedColonies,
      ).andThen((colony) => {
        this.grantBonuses(player, colony, influence);
        return undefined;
      }),
    );
  }

  private grantBonuses(player: IPlayer, colony: IColony, timesRemaining: number): void {
    if (timesRemaining <= 0) {
      return;
    }
    const input = colony.giveColonyBonus(player, true);
    if (input !== undefined) {
      player.setWaitingFor(input, () => this.grantBonuses(player, colony, timesRemaining - 1));
    } else {
      this.grantBonuses(player, colony, timesRemaining - 1);
    }
  }
}
