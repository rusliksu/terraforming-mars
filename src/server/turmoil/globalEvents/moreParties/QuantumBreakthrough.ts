import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '@/common/turmoil/PartyName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {Size} from '@/common/cards/render/Size';
import {IGame} from '@/server/IGame';
import {IPlayer} from '@/server/IPlayer';
import {Turmoil} from '@/server/turmoil/Turmoil';

// More Parties (Quantum Breakthrough / "Solar Criptocurrency"): "levels of energy production" has
// no Countable counter in this codebase (only tags/cities/colonies/etc. are countable) -- resolved
// bespoke against player.production.energy. Production could in principle be negative (or a
// negative influence could theoretically apply, though Turmoil influence is never negative in
// practice); the combined total is clamped at 0 before dividing so this never grants a negative draw.
export class QuantumBreakthrough extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.QUANTUM_BREAKTHROUGH,
      description: 'Each player draws one card for every 2 levels of energy production. Influence is considered energy production.',
      revealedDelegate: PartyName.EMPOWER,
      currentDelegate: PartyName.TRANSHUMANISTS,
      renderData: CardRenderer.builder((b) => {
        b.production((pb) => pb.energy(1)).plus().influence({size: Size.SMALL}).slash().text('2', {size: Size.SMALL}).colon().cards(1);
      }),
    });
  }

  public override bespokeResolvePlayer(player: IPlayer) {
    const game: IGame = player.game;
    const turmoil = Turmoil.getTurmoil(game);
    const levels = Math.max(0, player.production.energy + turmoil.getInfluence(player));
    const count = Math.floor(levels / 2);
    if (count > 0) {
      player.drawCard(count);
    }
  }
}
