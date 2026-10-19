import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IPlayer} from '../../../IPlayer';
import {Turmoil} from '../../Turmoil';
import {Resource} from '../../../../common/Resource';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

/**
 * Financial Crisis (More Parties, fan) / "Preferential Loans": each player gains 5 M€, then
 * decreases M€ production one step for every 5 TR over 15 (max 5 steps), plus influence
 * (uncapped, added after the cap per the standard "(max N) ... plus/reduced by influence"
 * convention used across these global events).
 */
export class FinancialCrisis extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.FINANCIAL_CRISIS,
      description: 'Each player receives 5 M€ and decreases their M€ production one step for every 5 TR over 15 (max 5), plus influence.',
      revealedDelegate: PartyName.POPULISTS,
      currentDelegate: PartyName.CENTRISTS,
      behavior: {
        stock: {
          megacredits: 5,
        },
      },
      renderData: CardRenderer.builder((b) => {
        b.megacredits(5).br;
        b.minus().production((pb) => pb.megacredits(1)).slash().text('5 TR>15', {size: Size.SMALL}).influence({size: Size.SMALL});
      }),
    });
  }

  public override bespokeResolvePlayer(player: IPlayer) {
    const turmoil = Turmoil.getTurmoil(player.game);
    const trSteps = Math.min(5, Math.floor(Math.max(0, player.terraformRating - 15) / 5));
    const steps = trSteps + turmoil.getInfluence(player);
    if (steps > 0) {
      player.production.add(Resource.MEGACREDITS, -steps, {log: true, from: {globalEvent: this}});
    }
  }
}
