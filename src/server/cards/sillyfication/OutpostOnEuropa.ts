import {IProjectCard} from '../IProjectCard';
import {Tag} from '../../../common/cards/Tag';
import {Card} from '../Card';
import {CardType} from '../../../common/cards/CardType';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {CardResource} from '../../../common/CardResource';
import {all} from '../Options';

export class OutpostOnEuropa extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.OUTPOST_ON_EUROPA,
      tags: [Tag.JOVIAN, Tag.MICROBE],
      cost: 23,
      victoryPoints: 2,

      requirements: {tag: Tag.MICROBE, count: 3},

      behavior: {
        addResourcesToAnyCard: {count: {tag: Tag.JOVIAN, all: true}, type: CardResource.MICROBE},
      },

      metadata: {
        cardNumber: 'X55',
        renderData: CardRenderer.builder((b) => {
          b.resource(CardResource.MICROBE).asterix().slash().tag(Tag.JOVIAN, {all});
        }),
        description: 'Requires 3 Microbe tags. Choose 1 of your played cards and add 1 microbe to it for every Jovian tag in play, including this.',
      },
    });
  }
}
