import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {IPlayer} from '../../../IPlayer';
import {Turmoil} from '../../Turmoil';
import {Tag} from '../../../../common/cards/Tag';
import {Resource} from '../../../../common/Resource';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

export class Cybernetic extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.CYBERNETIC,
      description: 'Each player with at least 5 science tags (including influence) raises their titanium production 1 step.',
      revealedDelegate: PartyName.TRANSHUMANISTS,
      currentDelegate: PartyName.EMPOWER,
      renderData: CardRenderer.builder((b) => {
        b.tag(Tag.SCIENCE).plus().influence({size: Size.SMALL}).text('5+', {size: Size.SMALL}).colon().production((pb) => pb.titanium(1));
      }),
    });
  }

  // There's no "count tags plus influence, then compare to a threshold" primitive in the
  // Countable DSL (it can cap/reduce a count, but not gate a production raise on it), so this
  // is computed directly.
  public override bespokeResolvePlayer(player: IPlayer) {
    const turmoil = Turmoil.getTurmoil(player.game);
    const scienceTags = player.tags.count(Tag.SCIENCE, 'raw') + turmoil.getInfluence(player);
    if (scienceTags >= 5) {
      player.production.add(Resource.TITANIUM, 1, {log: true});
    }
  }
}
