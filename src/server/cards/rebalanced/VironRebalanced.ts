import {CardName} from '@/common/cards/CardName';
import {Viron} from '@/server/cards/venusNext/Viron';
import {CardRenderer} from '@/server/cards/render/CardRenderer';

export class VironRebalanced extends Viron {
  public override get name() {
    return CardName.VIRON_REBALANCED;
  }

  public override get startingMegaCredits() {
    return 54;
  }

  public override get metadata() {
    return {
      ...super.metadata,
      description: 'You start with 54 M€.',
      renderData: CardRenderer.builder((b) => {
        b.megacredits(54);
        b.corpBox('action', (ce) => {
          ce.action('Use a blue card action that has already been used this generation.', (eb) => eb.empty().startAction.empty());
        });
      }),
    };
  }
}
