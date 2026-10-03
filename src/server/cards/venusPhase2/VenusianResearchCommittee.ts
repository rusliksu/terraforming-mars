import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

export class VenusianResearchCommittee extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.VENUSIAN_RESEARCH_COMMITTEE,
      tags: [Tag.SCIENCE, Tag.VENUS],
      cost: 17,

      behavior: {
        global: {venus: 1},
        drawCard: {count: {tag: Tag.VENUS, per: 2}},
      },

      metadata: {
        cardNumber: 'V84',
        renderData: CardRenderer.builder((b) => {
          b.cards(1).slash().tag(Tag.VENUS, {amount: 2, digit}).nbsp.venus(1);
        }),
        description: 'Draw a card for every 2 Venus tags you have. Raise Venus 1 step.',
      },
    });
  }
}
