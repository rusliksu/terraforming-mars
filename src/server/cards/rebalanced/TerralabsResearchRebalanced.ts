import {CardName} from '@/common/cards/CardName';
import {TerralabsResearch} from '@/server/cards/turmoil/TerralabsResearch';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class TerralabsResearchRebalanced extends TerralabsResearch {
  public override get name() {
    return CardName.TERRALABS_RESEARCH_REBALANCED;
  }

  public override get startingMegaCredits() {
    return 30;
  }

  public override get metadata() {
    return {
      ...super.metadata,
      description: 'You start with 30 M€. Lower your TR 1 step.',
      renderData: CardRenderer.builder((b) => {
        b.megacredits(30).nbsp.minus().tr(1);
        b.corpBox('effect', (ce) => {
          ce.effect('Buying cards to hand costs 1 M€.', (eb) => eb.cards(1).startEffect.megacredits(1));
        });
      }),
    };
  }
}
