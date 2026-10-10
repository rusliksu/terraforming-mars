import {GHGImportFromVenus} from '@/server/cards/venusNext/GHGImportFromVenus';
import {CardName} from '@/common/cards/CardName';

export class GHGImportFromVenusRebalanced extends GHGImportFromVenus {
  public override get name() {
    return CardName.GHG_IMPORT_FROM_VENUS_REBALANCED;
  }

  public override get cost() {
    return 20;
  }
}
