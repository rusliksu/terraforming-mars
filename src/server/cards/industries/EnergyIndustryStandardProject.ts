import {CardName} from '../../../common/cards/CardName';
import {Resource} from '../../../common/Resource';
import {TileType} from '../../../common/TileType';
import {IndustryStandardProject} from './IndustryStandardProject';

export class EnergyIndustryStandardProject extends IndustryStandardProject {
  constructor() {
    super(CardName.ENERGY_INDUSTRY_STANDARD_PROJECT, 10, Resource.ENERGY, TileType.INDUSTRY_ENERGY, 3);
  }
}
