import {EarthOffice} from '@/server/cards/base/EarthOffice';
import {CardName} from '@/common/cards/CardName';

export class EarthOfficeRebalanced extends EarthOffice {
  public override get name() {
    return CardName.EARTH_OFFICE_REBALANCED;
  }
  public override get cost() {
    return 4;
  }
}
