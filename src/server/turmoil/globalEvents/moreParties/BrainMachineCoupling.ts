import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IPlayer} from '../../../IPlayer';
import {Turmoil} from '../../Turmoil';
import {SendDelegateToArea} from '../../../deferredActions/SendDelegateToArea';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';
import {VenusPhase2Expansion} from '../../../venusPhase2/VenusPhase2Expansion';

export class BrainMachineCoupling extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.BRAIN_MACHINE_COUPLING,
      description: 'Each player receives one delegate for every 2 cities they own plus influence.',
      revealedDelegate: PartyName.TRANSHUMANISTS,
      currentDelegate: PartyName.BUREAUCRATS,
      renderData: CardRenderer.builder((b) => {
        b.delegates(1).slash().city().plus().influence({size: Size.SMALL}).nbsp.text('(per 2)', {size: Size.SMALL});
      }),
    });
  }

  // Computed manually rather than with `turmoil.sendDelegates` in the declarative `behavior` DSL:
  // that DSL always defers a `SendDelegateToArea` prompt even when the computed count is 0, which
  // would ask every player with fewer than 2 cities and no influence to select a party for nothing.
  public override bespokeResolvePlayer(player: IPlayer) {
    const game = player.game;
    const turmoil = Turmoil.getTurmoil(game);
    const cities = game.board.getCities(player).length + VenusPhase2Expansion.getCitiesCount(game, player);
    const influence = turmoil.getInfluence(player);
    const count = Math.floor((cities + influence) / 2);
    if (count > 0) {
      game.defer(new SendDelegateToArea(player, `Select where to send ${count} delegate(s)`, {count}));
    }
  }
}
