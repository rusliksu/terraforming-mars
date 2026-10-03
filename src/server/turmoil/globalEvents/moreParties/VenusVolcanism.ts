import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {Tag} from '../../../../common/cards/Tag';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

// More Parties (Venus Volcanism / "Controlled Tectonics"): "Raise Venus two levels" is a one-time
// whole-game effect, so it goes in `behavior.once` (run only against
// `game.playersInGenerationOrder[0]`, per GlobalEvent.resolve) rather than the top-level
// `behavior`, which runs once per player -- the same idiom VolcanicEruptions.ts and SnowCover.ts
// use for their temperature changes. The per-Venus-tag heat gain follows Countable's documented
// order (turmoil.max, then turmoil.influence, then each): cap the tag count at 5, add influence,
// then multiply by 2.
export class VenusVolcanism extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.VENUS_VOLCANISM,
      description: 'Raise Venus 2 steps. Each player gains 2 heat for every Venus tag (max 5), plus influence.',
      revealedDelegate: PartyName.SPOME,
      currentDelegate: PartyName.EMPOWER,
      behavior: {
        once: {
          global: {venus: 2},
        },
        stock: {
          heat: {tag: Tag.VENUS, each: 2, turmoil: {max: 5, influence: {}}},
        },
      },
      renderData: CardRenderer.builder((b) => {
        b.venus(2).br;
        b.heat(2).slash().tag(Tag.VENUS).influence({size: Size.SMALL});
      }),
    });
  }
}
