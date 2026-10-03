import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '@/common/turmoil/PartyName';
import {Tag} from '@/common/cards/Tag';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {Size} from '@/common/cards/render/Size';
import {IGame} from '@/server/IGame';
import {CardResource} from '@/common/CardResource';

// More Parties (Sanction on the Outskirts / "Smuggling Activity"): "ore resource" is
// CardResource.ORE (added for the High Orbit fan expansion, stored on Infrastructure-tagged
// cards like Asteroid Mine) -- removeResourcesFromAnyCard is the declarative primitive for
// taking it away, and is naturally forgiving: a player with no ore anywhere just loses none.
// "Move every colony token one space to the right" has no existing global-event precedent;
// implemented by calling increaseTrack() once on every colony in game.colonies, regardless of
// ownership, mirroring the decreaseTrack() approach used for Population Collapses.
export class SanctionOnTheOutskirts extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.SANCTION_ON_THE_OUTSKIRTS,
      description: 'Each player loses 1 ore resource for every Jovian tag they own (max 5, then reduced by influence). Move every colony token one space to the right.',
      revealedDelegate: PartyName.CENTRISTS,
      currentDelegate: PartyName.BUREAUCRATS,
      behavior: {
        removeResourcesFromAnyCard: {
          type: CardResource.ORE,
          source: 'self',
          count: {
            tag: Tag.JOVIAN,
            turmoil: {max: 5, influence: {subtract: true}},
          },
        },
      },
      renderData: CardRenderer.builder((b) => {
        b.minus().resource(CardResource.ORE, 1).slash().tag(Tag.JOVIAN).influence({size: Size.SMALL}).br;
        b.text('Colony markers +1', {size: Size.SMALL});
      }),
    });
  }

  public override bespokeResolve(game: IGame) {
    for (const colony of game.colonies) {
      colony.increaseTrack();
    }
  }
}
