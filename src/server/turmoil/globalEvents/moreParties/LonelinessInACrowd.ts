import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IPlayer} from '../../../IPlayer';
import {Resource} from '../../../../common/Resource';
import {Turmoil} from '../../Turmoil';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

export class LonelinessInACrowd extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.LONELINESS_IN_A_CROWD,
      description: 'Gain 1 M€ for each played card without a tag you own, plus influence.',
      revealedDelegate: PartyName.SPOME,
      currentDelegate: PartyName.TRANSHUMANISTS,
      renderData: CardRenderer.builder((b) => {
        b.megacredits(1).slash().cards(1).influence({size: Size.SMALL});
      }),
    });
  }

  // Interpretation: "one different resource" is a EPIC-flavor phrase this codebase doesn't
  // model (there's no generic "player picks any single standard resource type" reward
  // mechanic, and the effect wants ONE resource type for the whole gain, not a per-card
  // choice). Empower's own bonus A counts the same "cards with no tag" stat and grants M€
  // for it (see Empower.ts), so M€ is used here as the reasonable default resource.
  public override bespokeResolvePlayer(player: IPlayer) {
    const turmoil = Turmoil.getTurmoil(player.game);
    const noTagCards = player.tableau.asArray().filter((card) => card.tags.length === 0).length;
    const amount = Math.max(0, noTagCards + turmoil.getInfluence(player));
    if (amount > 0) {
      player.stock.add(Resource.MEGACREDITS, amount, {log: true, from: {globalEvent: this}});
    }
  }
}
