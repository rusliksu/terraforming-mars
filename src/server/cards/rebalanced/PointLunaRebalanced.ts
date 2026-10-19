import {Tag} from '@/common/cards/Tag';
import {IPlayer} from '@/server/IPlayer';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';
import {CorporationCard} from '@/server/cards/corporation/CorporationCard';
import {ICard} from '@/server/cards/ICard';
import {CardName} from '@/common/cards/CardName';
import {DiscardCards} from '@/server/deferredActions/DiscardCards';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class PointLunaRebalanced extends CorporationCard implements ICorporationCard {
  constructor() {
    super({
      name: CardName.POINT_LUNA_REBALANCED,
      tags: [Tag.SPACE, Tag.EARTH],
      startingMegaCredits: 48,

      behavior: {
        production: {titanium: 1},
      },

      metadata: {
        cardNumber: 'R10',
        description: 'You start with 1 titanium production and 48 M€.',
        renderData: CardRenderer.builder((b) => {
          b.br;
          b.production((pb) => pb.titanium(1)).nbsp.megacredits(48);
          b.corpBox('effect', (ce) => {
            ce.effect('When you play an Earth tag, including this, draw a card THEN DISCARD a card.', (eb) => {
              eb.tag(Tag.EARTH).startEffect.cards(1).minus().cards(1);
            });
          });
        }),
      },
    });
  }

  public onCardPlayed(player: IPlayer, card: ICard) {
    const tagCount = player.tags.cardTagCount(card, Tag.EARTH);
    if (tagCount > 0) {
      player.drawCard(tagCount);
      player.game.defer(new DiscardCards(player, tagCount, tagCount));
    }
  }
}
