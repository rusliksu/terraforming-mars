import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '@/common/turmoil/PartyName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {Size} from '@/common/cards/render/Size';
import {IGame} from '@/server/IGame';
import {Turmoil} from '@/server/turmoil/Turmoil';
import {DiscardCards} from '@/server/deferredActions/DiscardCards';

export class SpeciationOfHumanity extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.SPECIATION_OF_HUMANITY,
      description: 'The player with the most different tags (minus influence) discards two cards. Ties are unfriendly -- every tied player discards.',
      revealedDelegate: PartyName.SPOME,
      currentDelegate: PartyName.BUREAUCRATS,
      renderData: CardRenderer.builder((b) => {
        b.diverseTag(1).minus().influence({size: Size.SMALL}).colon().minus().cards(2);
      }),
    });
  }

  public override bespokeResolve(game: IGame) {
    const turmoil = Turmoil.getTurmoil(game);
    const scores = new Map(game.players.map((player) => [player, player.tags.distinctCount('globalEvent') - turmoil.getInfluence(player)]));
    const max = Math.max(...scores.values());
    for (const player of game.players) {
      if (scores.get(player) === max) {
        game.defer(new DiscardCards(player, 2, 2, 'Global Event - Speciation of Humanity: select 2 cards to discard'));
      }
    }
  }
}
