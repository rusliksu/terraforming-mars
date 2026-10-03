import {IProjectCard} from '@/server/cards/IProjectCard';
import {Card} from '@/server/cards/Card';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {IPlayer} from '@/server/IPlayer';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

/** A passive discount on buying cards to hand, patterned after Quantum Research's `player.cardCost` hook. */
export class FuturisticCentre extends Card implements IProjectCard {
  constructor() {
    super({
      type: CardType.ACTIVE,
      name: CardName.FUTURISTIC_CENTRE,
      tags: [Tag.SCIENCE, Tag.BUILDING],
      cost: 18,
      victoryPoints: 1,

      metadata: {
        cardNumber: 'CB01',
        renderData: CardRenderer.builder((b) => {
          b.effect('During research phase, you pay 1 M€ less for cards you buy.', (eb) => {
            eb.cards(1).startEffect.megacredits(-1);
          });
        }),
      },
    });
  }

  public override bespokePlay(player: IPlayer) {
    player.cardCost = Math.max(0, player.cardCost - 1);
    return undefined;
  }
}
