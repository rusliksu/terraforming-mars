import {CardName} from '../../../common/cards/CardName';
import {Resource} from '../../../common/Resource';
import {TileType} from '../../../common/TileType';
import {IndustryStandardProject} from './IndustryStandardProject';

export class HeatIndustryStandardProject extends IndustryStandardProject {
  constructor() {
    super(CardName.HEAT_INDUSTRY_STANDARD_PROJECT, 6, Resource.HEAT, TileType.INDUSTRY_HEAT, 4);
  }
}
