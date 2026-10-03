import {CardName} from '../../../common/cards/CardName';
import {ModuleManifest} from '../ModuleManifest';
import {HeatIndustryStandardProject} from './HeatIndustryStandardProject';
import {MoneyIndustryStandardProject} from './MoneyIndustryStandardProject';
import {EnergyIndustryStandardProject} from './EnergyIndustryStandardProject';
import {SteelIndustryStandardProject} from './SteelIndustryStandardProject';
import {PlantIndustryStandardProject} from './PlantIndustryStandardProject';
import {TitaniumIndustryStandardProject} from './TitaniumIndustryStandardProject';
import {WildIndustryStandardProject} from './WildIndustryStandardProject';

export const INDUSTRIES_CARD_MANIFEST = new ModuleManifest({
  module: 'industries',
  standardProjects: {
    [CardName.HEAT_INDUSTRY_STANDARD_PROJECT]: {Factory: HeatIndustryStandardProject},
    [CardName.MONEY_INDUSTRY_STANDARD_PROJECT]: {Factory: MoneyIndustryStandardProject},
    [CardName.ENERGY_INDUSTRY_STANDARD_PROJECT]: {Factory: EnergyIndustryStandardProject},
    [CardName.STEEL_INDUSTRY_STANDARD_PROJECT]: {Factory: SteelIndustryStandardProject},
    [CardName.PLANT_INDUSTRY_STANDARD_PROJECT]: {Factory: PlantIndustryStandardProject},
    [CardName.TITANIUM_INDUSTRY_STANDARD_PROJECT]: {Factory: TitaniumIndustryStandardProject},
    [CardName.WILD_INDUSTRY_STANDARD_PROJECT]: {Factory: WildIndustryStandardProject},
  },
});
