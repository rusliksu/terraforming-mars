import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {MartianIndustries} from '@/server/cards/prelude/MartianIndustries';

export class MartianIndustriesRebalanced extends MartianIndustries {
  public override get name() {
    return CardName.MARTIAN_INDUSTRIES_REBALANCED;
  }

  public override get tags() {
    return [Tag.BUILDING, Tag.POWER];
  }
}
