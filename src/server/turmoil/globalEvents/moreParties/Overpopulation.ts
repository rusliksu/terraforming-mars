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

// More Parties (Overpopulation / "Adapted Pathogens"): "draw one postlude card" is an unmodeled
// EPIC-campaign concept (no postlude deck exists in this codebase) -- collapsed to a plain draw,
// matching the established compromise in Populists.ts. "Loses one animal resource and receives
// one microbe resource for every microbe tag plus influence" is read as converting N animal
// resources into N microbe resources, where N = microbe tags owned + influence (the "for every"
// clause scales both halves of the trade, not just the microbe gain).
export class Overpopulation extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.OVERPOPULATION,
      description: 'Each player draws 1 card. Each player loses 1 animal resource and receives 1 microbe resource for every microbe tag plus influence.',
      revealedDelegate: PartyName.POPULISTS,
      currentDelegate: PartyName.SPOME,
      behavior: {
        drawCard: 1,
      },
      renderData: CardRenderer.builder((b) => {
        b.cards(1).br;
        b.minus().resource(CardResource.ANIMAL).plus().resource(CardResource.MICROBE).slash().tag(Tag.MICROBE).influence({size: Size.SMALL});
      }),
    });
  }

  public override bespokeResolvePlayer(player: IPlayer) {
    const game: IGame = player.game;
    const turmoil = Turmoil.getTurmoil(game);
    const count = player.tags.count(Tag.MICROBE, 'raw') + turmoil.getInfluence(player);
    if (count <= 0) {
      return;
    }

    let remaining = count;
    for (const card of player.getCardsWithResources(CardResource.ANIMAL)) {
      if (remaining <= 0) {
        break;
      }
      const toRemove = Math.min(card.resourceCount, remaining);
      player.removeResourceFrom(card, toRemove, {log: true});
      remaining -= toRemove;
    }

    game.defer(new AddResourcesToCard(player, CardResource.MICROBE, {count, log: true}));
  }
}
