import {Tag} from '../../../common/cards/Tag';
import {PreludeCard} from '../prelude/PreludeCard';
import {CardName} from '../../../common/cards/CardName';
import {CardRenderer} from '../render/CardRenderer';
import {digit} from '../Options';

export class InsiderTrading extends PreludeCard {
  constructor() {
    super({
      name: CardName.INSIDER_TRADING,
      tags: [Tag.CRIME],

      behavior: {
        underworld: {corruption: 4},
      },

      metadata: {
        cardNumber: 'T18',
        renderData: CardRenderer.builder((b) => {
          b.corruption(4, {digit});
        }),
        description: 'Gain 4 corruption.',
      },
    });
  }
}
