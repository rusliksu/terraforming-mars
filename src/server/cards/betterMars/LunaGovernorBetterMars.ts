import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {Card} from '../Card';
import {CardRenderer} from '../render/CardRenderer';

/**
 * Luna Governor, but it requires Moon tags instead of Earth tags.
 *
 * Extends Card directly rather than LunaGovernor: canPlay() checks the tag requirement
 * compiled at construction time from this card's own `requirements`, not from the
 * `requirements` getter, so a subclass can't swap the tag by overriding that getter alone.
 */
export class LunaGovernorBetterMars extends Card implements IProjectCard {
  constructor() {
    super({
      cost: 4,
      tags: [Tag.MOON, Tag.MOON],
      name: CardName.LUNA_GOVERNOR_BETTER_MARS,
      type: CardType.AUTOMATED,

      behavior: {
        production: {megacredits: 2},
      },

      requirements: {tag: Tag.MOON, count: 3},
      metadata: {
        cardNumber: 'X79',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.megacredits(2));
        }),
        description: 'Requires 3 Moon tags. Increase your M€ production 2 steps.',
      },
    });
  }
}
