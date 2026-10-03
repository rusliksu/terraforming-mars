import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {Tag} from '../../../../common/cards/Tag';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

// More Parties (Black Swan Manifestation / "Technological Telepathy"): "Influence is considered
// science tags" means influence is added to the science-tag count *before* dividing by 3 -- the
// same order Countable.ts documents (`turmoil.influence` applied, then `per`), which is exactly
// what SnowCover.ts's `drawCard: {count: {turmoil: {influence: {}}}}` idiom already relies on.
export class BlackSwanManifestation extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.BLACK_SWAN_MANIFESTATION,
      description: 'Each player draws 1 card for every 3 science tags they own (influence counts as science tags).',
      revealedDelegate: PartyName.POPULISTS,
      currentDelegate: PartyName.EMPOWER,
      behavior: {
        drawCard: {
          count: {tag: Tag.SCIENCE, turmoil: {influence: {}}, per: 3},
        },
      },
      renderData: CardRenderer.builder((b) => {
        b.cards(1).slash().tag(Tag.SCIENCE, 3).plus().influence({size: Size.SMALL});
      }),
    });
  }
}
