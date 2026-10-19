import {CommunityServices} from '@/server/cards/colonies/CommunityServices';
import {CardName} from '@/common/cards/CardName';

export class CommunityServicesRebalanced extends CommunityServices {
  public readonly changesOwnProduction = true;
  public override get name() {
    return CardName.COMMUNITY_SERVICES_REBALANCED;
  }
  public override get cost() {
    return 11;
  }
}
