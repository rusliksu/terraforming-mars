import {CardName} from '../../../common/cards/CardName';
import {Resource} from '../../../common/Resource';
import {TileType} from '../../../common/TileType';
import {IndustryStandardProject} from './IndustryStandardProject';

export class TitaniumIndustryStandardProject extends IndustryStandardProject {
  constructor() {
    super(CardName.TITANIUM_INDUSTRY_STANDARD_PROJECT, 14, Resource.TITANIUM, TileType.INDUSTRY_TITANIUM, 2);
  }
}
