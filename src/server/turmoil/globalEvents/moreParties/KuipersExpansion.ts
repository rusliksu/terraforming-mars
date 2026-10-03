import {IGlobalEvent} from '../IGlobalEvent';
import {GlobalEvent} from '../GlobalEvent';
import {GlobalEventName} from '../../../../common/turmoil/globalEvents/GlobalEventName';
import {PartyName} from '../../../../common/turmoil/PartyName';
import {Tag} from '../../../../common/cards/Tag';
import {CardResource} from '../../../../common/CardResource';
import {CardRenderer} from '../../../cards/render/CardRenderer';
import {Size} from '../../../../common/cards/render/Size';

export class KuipersExpansion extends GlobalEvent implements IGlobalEvent {
  constructor() {
    super({
      name: GlobalEventName.KUIPERS_EXPANSION,
      description: 'Gain 1 ore resource on an Infrastructure-tagged card for each Infrastructure tag and influence.',
      revealedDelegate: PartyName.EMPOWER,
      currentDelegate: PartyName.SPOME,
      behavior: {
        // "infrastructure" = Tag.INFRASTRUCTURE (High Orbit fan expansion's Silver-card tag);
        // "ore resource" = CardResource.ORE, which only some Infrastructure-tagged cards can
        // hold -- addResourcesToAnyCard is forgiving when no card can accept it.
        addResourcesToAnyCard: {
          type: CardResource.ORE,
          count: {tag: Tag.INFRASTRUCTURE, turmoil: {influence: {}}},
        },
      },
      renderData: CardRenderer.builder((b) => {
        b.resource(CardResource.ORE, 1).slash().tag(Tag.INFRASTRUCTURE).plus().influence({size: Size.SMALL});
      }),
    });
  }
}
