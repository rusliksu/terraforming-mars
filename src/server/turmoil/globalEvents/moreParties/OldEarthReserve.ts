import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '@/common/turmoil/PartyName';
import {Tag} from '@/common/cards/Tag';
import {CardResource} from '@/common/CardResource';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {Size} from '@/common/cards/render/Size';
import {IGame} from '@/server/IGame';
import {IPlayer} from '@/server/IPlayer';
import {Turmoil} from '@/server/turmoil/Turmoil';
import {AddResourcesToCard} from '@/server/deferredActions/AddResourcesToCard';

// More Parties (Old Earth Reserve / "Exhalt Species"): the source text reads "for every animal
// tag owned OR for every influence" -- two different counting bases for the same reward, not two
// effects to choose between. Interpreted as Math.max(animalTagCount, influence), per this batch's
// house rule for "X OR Y" reward-counting phrasing on More Parties global events.
export class OldEarthReserve extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.OLD_EARTH_RESERVE,
      description: 'Each player receives 1 animal resource for every animal tag owned, or for every influence, whichever is more.',
      revealedDelegate: PartyName.SPOME,
      currentDelegate: PartyName.BUREAUCRATS,
      renderData: CardRenderer.builder((b) => {
        b.resource(CardResource.ANIMAL).slash().tag(Tag.ANIMAL).or().influence({size: Size.SMALL});
      }),
    });
  }

  public override bespokeResolvePlayer(player: IPlayer) {
    const game: IGame = player.game;
    const turmoil = Turmoil.getTurmoil(game);
    const count = Math.max(player.tags.count(Tag.ANIMAL, 'raw'), turmoil.getInfluence(player));
    if (count > 0) {
      game.defer(new AddResourcesToCard(player, CardResource.ANIMAL, {count, log: true}));
    }
  }
}
