import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IPlayer} from '../../../IPlayer';
import {Resource} from '../../../../common/Resource';
import {CardResource} from '../../../../common/CardResource';
import {Turmoil} from '../../Turmoil';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';
import {AltSecondaryTag} from '../../../../common/cards/render/AltSecondaryTag';

// More Parties (Atmospheric Ports / "Duty Free Space"): "active card with floater resources on
// it" counts *cards*, not floater tokens -- the declarative `floaters` Countable field sums
// `player.getResourceCount(CardResource.FLOATER)` (see src/server/behavior/Counter.ts), which is
// the wrong quantity here. `player.getCardsWithResources(CardResource.FLOATER)` (the same helper
// CloudSocieties.ts uses for a per-card check) gives cards currently holding at least one floater,
// matching the card text. Influence is added to that card count before the ×2, following the same
// order Countable.ts documents for its `turmoil.influence`/`each` fields.
export class AtmosphericPorts extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.ATMOSPHERIC_PORTS,
      description: 'Each player gains 2 M€ for every active card with floater resources on it, plus influence.',
      revealedDelegate: PartyName.SPOME,
      currentDelegate: PartyName.BUREAUCRATS,
      renderData: CardRenderer.builder((b) => {
        b.megacredits(2).slash().cards(1, {secondaryTag: AltSecondaryTag.FLOATER}).plus().influence({size: Size.SMALL});
      }),
    });
  }

  public override bespokeResolvePlayer(player: IPlayer) {
    const turmoil = Turmoil.getTurmoil(player.game);
    const cardsWithFloaters = player.getCardsWithResources(CardResource.FLOATER).length;
    const amount = 2 * (cardsWithFloaters + turmoil.getInfluence(player));
    player.stock.add(Resource.MEGACREDITS, amount, {log: true, from: {globalEvent: this}});
  }
}
