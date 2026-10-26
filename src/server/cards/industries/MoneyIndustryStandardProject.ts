import {CardName} from '../../../common/cards/CardName';
import {Resource} from '../../../common/Resource';
import {TileType} from '../../../common/TileType';
import {IndustryStandardProject} from './IndustryStandardProject';

export class MoneyIndustryStandardProject extends IndustryStandardProject {
  constructor() {
    super(CardName.MONEY_INDUSTRY_STANDARD_PROJECT, 8, Resource.MEGACREDITS, TileType.INDUSTRY_MONEY, 4);
  }
}
