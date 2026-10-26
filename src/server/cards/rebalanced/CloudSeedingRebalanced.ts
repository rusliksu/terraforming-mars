import {CloudSeeding} from '@/server/cards/base/CloudSeeding';
import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';

export class CloudSeedingRebalanced extends CloudSeeding {
  public override get name() {
    return CardName.CLOUD_SEEDING_REBALANCED;
  }
  public override get cost() {
    return 11;
  }
  public override get tags() {
    return [Tag.PLANT];
  }
}
