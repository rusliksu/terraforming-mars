import {IProjectCard} from '@/server/cards/IProjectCard';
import {Card} from '@/server/cards/Card';
import {CardType} from '@/common/cards/CardType';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class SeabedExtraction extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.AUTOMATED,
      name: CardName.SEABED_EXTRACTION,
      tags: [],
      cost: 8,

      behavior: {
        stock: {steel: {oceans: {}}},
      },

      metadata: {
        cardNumber: 'CB11',
        renderData: CardRenderer.builder((b) => {
          b.steel(1).slash().oceans(1);
        }),
        description: 'Gain 1 steel for each ocean tile in play.',
      },
    });
  }
}
