import {Tag} from '@/common/cards/Tag';
import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {Size} from '@/common/cards/render/Size';
import {digit} from '@/server/cards/Options';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';

export class PhoboLogRebalanced extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.PHOBOLOG_REBALANCED,
      tags: [Tag.SPACE],
      startingMegaCredits: 30,

      behavior: {
        stock: {titanium: 8},
        titanumValue: 1,
      },

      firstAction: {
        text: 'Draw two cards with a space tag',
        drawCard: {count: 2, tag: Tag.SPACE},
      },

      metadata: {
        cardNumber: 'R09',
        description: 'You start with 8 titanium and 30 M€. As your first action, reveal cards from the deck until you have revealed 2 cards with a space tag. Take them into hand and discard the rest.',
        renderData: CardRenderer.builder((b) => {
          b.br.br;
          b.megacredits(30).nbsp.titanium(8, {digit}).nbsp.cards(2, {secondaryTag: Tag.SPACE});
          b.corpBox('effect', (ce) => {
            ce.effect('Your titanium resources are each worth 1 M€ extra.', (eb) => {
              eb.titanium(1).startEffect.plus(Size.SMALL).megacredits(1);
            });
          });
        }),
      },
    });
  }
}
