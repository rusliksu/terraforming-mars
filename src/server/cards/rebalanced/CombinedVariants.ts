import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {EarlySettlementRebalanced} from './EarlySettlementRebalanced';
import {SelfSufficientSettlementRebalanced} from './SelfSufficientSettlementRebalanced';
import {PristarRebalanced} from './PristarRebalanced';
import {MartianRailsRebalanced} from './MartianRailsRebalanced';
import {TropicalResortRebalanced} from './TropicalResortRebalanced';

export class EarlySettlementRebalancedBetterMars extends EarlySettlementRebalanced {
  public override get name() {
    return CardName.EARLY_SETTLEMENT_REBALANCED_BETTER_MARS;
  }

  public override get tags() {
    return [Tag.BUILDING, Tag.CITY, Tag.MARS];
  }
}

export class SelfSufficientSettlementRebalancedBetterMars extends SelfSufficientSettlementRebalanced {
  public override get name() {
    return CardName.SELF_SUFFICIENT_SETTLEMENT_REBALANCED_BETTER_MARS;
  }

  public override get tags() {
    return [Tag.BUILDING, Tag.CITY, Tag.MARS];
  }
}

export class PristarRebalancedBetterMars extends PristarRebalanced {
  public override get name() {
    return CardName.PRISTAR_REBALANCED_BETTER_MARS;
  }

  public override get tags() {
    return [Tag.MARS];
  }
}

export class MartianRailsRebalancedBetterMars extends MartianRailsRebalanced {
  public override get name() {
    return CardName.MARTIAN_RAILS_REBALANCED_BETTER_MARS;
  }

  public override get tags() {
    return [Tag.BUILDING, Tag.MARS];
  }
}

export class TropicalResortRebalancedBetterMars extends TropicalResortRebalanced {
  public override get name() {
    return CardName.TROPICAL_RESORT_REBALANCED_BETTER_MARS;
  }

  public override get tags() {
    return [Tag.BUILDING, Tag.MARS];
  }
}
