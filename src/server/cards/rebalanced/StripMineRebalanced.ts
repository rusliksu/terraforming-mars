import {CardName} from '@/common/cards/CardName';
import {StripMine} from '@/server/cards/base/StripMine';

export class StripMineRebalanced extends StripMine {
  public override get name() {
    return CardName.STRIP_MINE_REBALANCED;
  }

  public override get cost() {
    return 23;
  }

  public override get metadata() {
    return {
      ...super.metadata,
      description: 'Decrease your Energy production 2 steps. Increase your steel production 2 steps and your titanium production 1 step. Raise oxygen 2 steps.',
    };
  }
}
