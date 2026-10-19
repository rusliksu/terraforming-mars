import {ExtractorBalloons} from '@/server/cards/venusNext/ExtractorBalloons';
import {CardName} from '@/common/cards/CardName';

export class ExtractorBalloonsRebalanced extends ExtractorBalloons {
  public override get name() {
    return CardName.EXTRACTOR_BALLOONS_REBALANCED;
  }

  public override get cost() {
    return 18;
  }
}
