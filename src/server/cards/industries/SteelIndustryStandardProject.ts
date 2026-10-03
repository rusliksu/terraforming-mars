import {CardName} from '../../../common/cards/CardName';
import {Resource} from '../../../common/Resource';
import {TileType} from '../../../common/TileType';
import {IndustryStandardProject} from './IndustryStandardProject';

export class SteelIndustryStandardProject extends IndustryStandardProject {
  constructor() {
    super(CardName.STEEL_INDUSTRY_STANDARD_PROJECT, 10, Resource.STEEL, TileType.INDUSTRY_STEEL, 3);
  }
}
