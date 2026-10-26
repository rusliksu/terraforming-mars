import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class IoResearchOutpostRebalanced extends PreludeCard {
  constructor() {
    super({
      name: CardName.IO_RESEARCH_OUTPOST_REBALANCED,
      tags: [Tag.JOVIAN, Tag.SCIENCE],

      behavior: {
        production: {titanium: 1},
        drawCard: 2,
      },

      metadata: {
        cardNumber: 'P16',
        renderData: CardRenderer.builder((b) => {
          b.production((pb) => pb.titanium(1)).br;
          b.cards(2);
        }),
        description: 'Increase your titanium production 1 step. Draw 2 cards.',
      },
    });
  }
}
