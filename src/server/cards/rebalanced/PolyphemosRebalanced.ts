import {IPlayer} from '@/server/IPlayer';
import {ICard} from '@/server/cards/ICard';
import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {digit} from '@/server/cards/Options';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';

export class PolyphemosRebalanced extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.POLYPHEMOS_REBALANCED,
      startingMegaCredits: 55,
      cardCost: 5,

      behavior: {
        production: {megacredits: 5},
        stock: {titanium: 5},
      },

      metadata: {
        cardNumber: 'R11',
        description: 'You start with 55 M€. Increase your M€ production 5 steps. Gain 5 titanium.',
        renderData: CardRenderer.builder((b) => {
          b.br;
          b.megacredits(55).nbsp.production((pb) => pb.megacredits(5)).nbsp.titanium(5, {digit});
          b.corpBox('effect', (ce) => {
            ce.effect('When you buy a card to hand, pay 5M€ instead of 3, including the starting hand. When you play a card with a basic cost of 20 M€ or more, draw a card.', (eb) => {
              eb.cards(1).asterix().startEffect.megacredits(5);
            });
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    if ((card.cost ?? 0) >= 20) {
      player.drawCard();
    }
  }
}
