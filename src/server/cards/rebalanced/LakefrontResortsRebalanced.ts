import {LakefrontResorts} from '@/server/cards/turmoil/LakefrontResorts';
import {CardName} from '@/common/cards/CardName';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {all} from '@/server/cards/Options';

export class LakefrontResortsRebalanced extends LakefrontResorts {
  public override get name() {
    return CardName.LAKEFRONT_RESORTS_REBALANCED;
  }
  public override get startingMegaCredits() {
    return 46;
  }
  public override get metadata() {
    return {
      ...super.metadata,
      description: 'You start with 46 M€.',
      renderData: CardRenderer.builder((b) => {
        b.megacredits(46);
        b.corpBox('effect', (ce) => ce.effect('When any ocean tile is placed, increase your M€ production 1 step. Your bonus for placing adjacent to oceans is 3 M€ instead of 2 M€.', (eb) => {
          eb.oceans(1, {all}).colon().production((pb) => pb.megacredits(1));
          eb.emptyTile('normal').oceans(1).startEffect.megacredits(3);
        }));
      }),
    };
  }
}
