import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {CardRenderer} from '../../../cards/render/CardRenderer';

export class InterstellarSignal extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.INTERSTELLAR_SIGNAL,
      description: 'Draw 1 card for each influence.',
      revealedDelegate: PartyName.BUREAUCRATS,
      currentDelegate: PartyName.SPOME,
      behavior: {
        drawCard: {count: {turmoil: {influence: {}}}},
      },
      renderData: CardRenderer.builder((b) => {
        b.cards(1).slash().influence();
      }),
    });
  }
}
