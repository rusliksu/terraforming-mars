import {CardName} from '@/common/cards/CardName';
import {UtopiaInvest} from '@/server/cards/turmoil/UtopiaInvest';
import {CardRenderer} from '@/server/cards/render/CardRenderer';
import {digit} from '@/server/cards/Options';

export class UtopiaInvestRebalanced extends UtopiaInvest {
  public override get name() {
    return CardName.UTOPIA_INVEST_REBALANCED;
  }

  public override get startingMegaCredits() {
    return 48;
  }

  public override get metadata() {
    return {
      ...super.metadata,
      description: 'You start with 48 M€. Increase your steel and titanium production 1 step each.',
      renderData: CardRenderer.builder((b) => {
        b.megacredits(48).nbsp.production((pb) => pb.steel(1).titanium(1));
        b.corpBox('action', (ce) => {
          ce.action('Decrease any production to gain 4 resources of that kind.', (eb) => {
            eb.production((pb) => pb.wild(1)).startAction.wild(4, {digit});
          });
        });
      }),
    };
  }
}
