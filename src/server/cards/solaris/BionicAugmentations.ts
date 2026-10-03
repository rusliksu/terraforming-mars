import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {PartyName} from '../../../common/turmoil/PartyName';

/**
 * Bionic Augmentations (Solaris, fan): a permanent tag-requirement discount, using the same
 * declarative `tagCardRequirementBonus` property that ExcavationSyriaPlanum uses for its
 * one-shot "next card" version -- omitting `nextCardOnly` makes it apply for as long as
 * this card stays in the player's tableau (see `Player.getTagCardRequirementBonus`, which
 * sums this across every played card every time a Science-tag requirement is checked).
 */
export class BionicAugmentations extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.BIONIC_AUGMENTATIONS,
      tags: [Tag.SCIENCE],
      cost: 6,

      requirements: {party: PartyName.TRANSHUMANISTS},
      tagCardRequirementBonus: {steps: 2, tag: Tag.SCIENCE},

      metadata: {
        cardNumber: 'SOL13',
        renderData: CardRenderer.builder((b) => {
          b.effect('Cards with a Science tag requirement need 2 fewer Science tags to play.', (eb) => {
            eb.tag(Tag.SCIENCE).startEffect.tag(Tag.SCIENCE).text('-2');
          });
        }),
        description: 'Requires that Transhumanists are ruling or that you have 2 delegates there.',
      },
    });
  }
}
