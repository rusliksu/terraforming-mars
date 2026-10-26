import {CardName} from '@/common/cards/CardName';
import {Resource} from '@/common/Resource';
import {IPlayer} from '@/server/IPlayer';
import {ICard} from '@/server/cards/ICard';
import {Vitor} from '@/server/cards/prelude/Vitor';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class VitorRebalanced extends Vitor {
  public override get name() {
    return CardName.VITOR_REBALANCED;
  }

  public override get startingMegaCredits() {
    return 52;
  }

  public override get metadata() {
    return {
      ...super.metadata,
      description: 'You start with 52 M€. As your first action, fund an award for free.',
      renderData: CardRenderer.builder((b) => {
        b.megacredits(52).nbsp.award();
        b.corpBox('effect', (ce) => {
          ce.effect('When you play a card with a non-negative VP icon, gain 2 M€.', (eb) => eb.vpIcon().startEffect.megacredits(2));
        });
      }),
    };
  }

  public override onCardPlayed(player: IPlayer, card: ICard) {
    // The published engine only defined getVictoryPoints on VP-bearing cards.
    if (card.metadata.victoryPoints !== undefined && card.getVictoryPoints(player) >= 0) {
      player.stock.add(Resource.MEGACREDITS, 2, {log: true, from: {card: this}});
    }
  }
}
