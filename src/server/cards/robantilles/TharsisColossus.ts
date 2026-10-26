import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {PartyName} from '../../../common/turmoil/PartyName';
import {CardRenderer} from '../render/CardRenderer';

export class TharsisColossus extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.THARSIS_COLOSSUS,
      tags: [Tag.MARS, Tag.BUILDING],
      cost: 14,

      requirements: {party: PartyName.MARS},
      victoryPoints: {tag: Tag.BUILDING, per: 3},

      metadata: {
        cardNumber: 'H30',
        renderData: CardRenderer.builder((b) => {
          b.vpText('1 VP for every 3 Building tags you own.');
        }),
        description: 'Requires that Mars First are ruling or that you have 2 delegates there.',
      },
    });
  }
}
