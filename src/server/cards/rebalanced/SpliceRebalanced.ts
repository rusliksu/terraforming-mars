import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {CardResource} from '@/common/CardResource';
import {Splice} from '@/server/cards/promo/Splice';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {all} from '@/server/cards/Options';

export class SpliceRebalanced extends Splice {
  public override get name() {
    return CardName.SPLICE_REBALANCED;
  }

  public override get startingMegaCredits() {
    return 52;
  }

  public override get metadata() {
    return {
      ...super.metadata,
      description: 'You start with 52 M€. As your first action, reveal cards until you have revealed 1 card with a microbe tag. Take it into hand and discard the rest.',
      renderData: CardRenderer.builder((b) => {
        b.megacredits(52).nbsp.cards(1, {secondaryTag: Tag.MICROBE});
        b.corpBox('effect', (ce) => {
          ce.effect('When a microbe tag is played, incl. this, THAT PLAYER gains 2 M€, or adds a microbe to THAT card, and you gain 2 M€.', (eb) => {
            eb.tag(Tag.MICROBE, {all}).startEffect.megacredits(2, {all}).or().resource(CardResource.MICROBE, {all});
            eb.megacredits(2);
          });
        });
      }),
    };
  }
}
