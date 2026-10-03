import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IPlayer} from '../../../IPlayer';
import {Tag} from '../../../../common/cards/Tag';
import {Resource} from '../../../../common/Resource';
import {Turmoil} from '../../Turmoil';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

// More Parties (Anti-Government Sentiment / "Raid on Privateers"): "at least 3 planet tags
// (reduced by their influence)" is a threshold check against a constant, not a proportional
// reward/penalty -- no Countable field expresses "compare an adjusted count to N," so this is
// computed by hand, following the same max-then-influence ordering Countable.ts documents.
// Planet tags = Mars/Earth/Jovian/Venus, matching the fan-expansion convention documented on
// SummitLogistics.ts (src/server/cards/prelude2/SummitLogistics.ts): includes Mars, excludes Moon.
const PLANET_TAGS = [Tag.MARS, Tag.EARTH, Tag.JOVIAN, Tag.VENUS];

export class AntiGovernmentSentiment extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.ANTI_GOVERNMENT_SENTIMENT,
      description: 'Every player with at least 3 planet tags (reduced by influence) loses 5 M€.',
      revealedDelegate: PartyName.SPOME,
      currentDelegate: PartyName.BUREAUCRATS,
      renderData: CardRenderer.builder((b) => {
        b.text('3+', {size: Size.SMALL})
          .tag(Tag.MARS, {size: Size.SMALL}).tag(Tag.EARTH, {size: Size.SMALL})
          .tag(Tag.JOVIAN, {size: Size.SMALL}).tag(Tag.VENUS, {size: Size.SMALL})
          .minus().influence({size: Size.SMALL})
          .colon().minus().megacredits(5);
      }),
    });
  }

  public override bespokeResolvePlayer(player: IPlayer) {
    const turmoil = Turmoil.getTurmoil(player.game);
    const planetTags = player.tags.multipleCount(PLANET_TAGS);
    const count = planetTags - turmoil.getInfluence(player);
    if (count >= 3) {
      player.stock.deduct(Resource.MEGACREDITS, 5, {log: true, from: {globalEvent: this}});
    }
  }
}
