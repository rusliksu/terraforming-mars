import {CardName} from '../../../common/cards/CardName';
import {Resource} from '../../../common/Resource';
import {TileType} from '../../../common/TileType';
import {IndustryStandardProject} from './IndustryStandardProject';

export class PlantIndustryStandardProject extends IndustryStandardProject {
  constructor() {
    super(CardName.PLANT_INDUSTRY_STANDARD_PROJECT, 14, Resource.PLANTS, TileType.INDUSTRY_PLANT, 2);
  }
}
