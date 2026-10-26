import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {Tag} from '../../../../common/cards/Tag';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

export class MarinersAgreements extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.MARINERS_AGREEMENTS,
      description: 'Gain 2 M€ for each city tag you own. Draw 1 card for each influence.',
      revealedDelegate: PartyName.CENTRISTS,
      currentDelegate: PartyName.SPOME,
      behavior: {
        stock: {
          megacredits: {tag: Tag.CITY, each: 2},
        },
        // "postlude card" is an EPIC-campaign concept this codebase doesn't model (no
        // postlude deck exists) -- treated as a plain project-card draw, and the "discard"
        // half of "draw and discard" is dropped since there's no separate postlude deck to
        // discard back into. Same compromise category as Populists.ts's own EPIC concepts.
        drawCard: {count: {turmoil: {influence: {}}}},
      },
      renderData: CardRenderer.builder((b) => {
        b.megacredits(2).slash().tag(Tag.CITY).nbsp.nbsp;
        b.cards(1).slash().influence({size: Size.SMALL});
      }),
    });
  }
}
