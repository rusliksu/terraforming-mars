import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';

// Behavior lives in player/Tags.ts (see the "Galileo Institute hook" in count(),
// cardHasTag(), and cardTagCount()), matching the existing Habitat Marte / Nereid
// Biosystems one-directional tag-substitution pattern.
export class GalileoInstitute extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.GALILEO_INSTITUTE,
      tags: [Tag.JOVIAN],
      cost: 21,
      victoryPoints: 2,

      requirements: {tag: Tag.SCIENCE, count: 1},

      metadata: {
        cardNumber: 'Im67',
        renderData: CardRenderer.builder((b) => {
          b.effect('Your Jovian tags count as science tags, but not vice versa.', (eb) => {
            eb.tag(Tag.JOVIAN).startEffect.tag(Tag.SCIENCE);
          });
        }),
        description: 'Requires 1 science tag.',
      },
    });
  }
}
