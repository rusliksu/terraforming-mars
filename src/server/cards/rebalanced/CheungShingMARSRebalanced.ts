import {Tag} from '@/common/cards/Tag';
import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';
import {ICard} from '@/server/cards/ICard';
import {IPlayer} from '@/server/IPlayer';
import {Resource} from '@/common/Resource';

export class CheungShingMARSRebalanced extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.CHEUNG_SHING_MARS_REBALANCED,
      tags: [Tag.BUILDING],
      startingMegaCredits: 44,

      behavior: {
        production: {megacredits: 3},
      },

      metadata: {
        cardNumber: 'R16',
        description: 'You start with 3 M€ production and 44 M€.',
        renderData: CardRenderer.builder((b) => {
          b.br.br;
          b.production((pb) => pb.megacredits(3)).nbsp.megacredits(44);
          b.corpBox('effect', (ce) => {
            ce.effect('When you play a building tag, including this, you gain 3 M€.', (eb) => {
              eb.tag(Tag.BUILDING).startEffect.megacredits(3);
            });
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    if (card.tags.includes(Tag.BUILDING)) {
      player.stock.add(Resource.MEGACREDITS, 3, {log: true, from: {card: this}});
    }
  }
}
