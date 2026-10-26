import {JetStreamMicroscrappers} from '@/server/cards/venusNext/JetStreamMicroscrappers';
import {CardName} from '@/common/cards/CardName';

export class JetStreamMicroscrappersRebalanced extends JetStreamMicroscrappers {
  public override get name() {
    return CardName.JET_STREAM_MICROSCRAPPERS_REBALANCED;
  }

  public override get cost() {
    return 7;
  }
}
