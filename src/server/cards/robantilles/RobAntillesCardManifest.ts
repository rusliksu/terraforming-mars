import {CardName} from '../../../common/cards/CardName';
import {ModuleManifest} from '../ModuleManifest';
import {Suburbs} from './Suburbs';
import {HarborBorealis} from './HarborBorealis';
import {HistoricalVideographicArchive} from './HistoricalVideographicArchive';
import {IndustrialMetropolis} from './IndustrialMetropolis';
import {OrcTurbines} from './OrcTurbines';
import {ParadiseCity} from './ParadiseCity';
import {Cacti} from './Cacti';
import {AlienReactorAtivation} from './AlienReactorAtivation';
import {HumpbackWhales} from './HumpbackWhales';
import {MobileBiologicalDome} from './MobileBiologicalDome';
import {GreenhouseLights} from './GreenhouseLights';
import {CorruptedDelegate} from './CorruptedDelegate';
import {UpgradedSaws} from './UpgradedSaws';
import {LaunchOfThePhoenix} from './LaunchOfThePhoenix';
import {UtopiaPlanitiaSpaceport} from './UtopiaPlanitiaSpaceport';
import {MartianArmedForces} from './MartianArmedForces';
import {ExcavationSyriaPlanum} from './ExcavationSyriaPlanum';
import {WeatherControlTower} from './WeatherControlTower';
import {CloudCityRA} from './CloudCityRA';
import {BattleOfZadonga} from './BattleOfZadonga';
import {DogsInSpace} from './DogsInSpace';
import {StemCellResearchCenter} from './StemCellResearchCenter';
import {TroposphericCity} from './TroposphericCity';
import {TerraformingBureauRestructuring} from './TerraformingBureauRestructuring';
import {RooftopGardensOfNoctis} from './RooftopGardensOfNoctis';
import {GreatLighthouseOfAlbaPatera} from './GreatLighthouseOfAlbaPatera';
import {GreatFaceOfCydonia} from './GreatFaceOfCydonia';
import {MausoleumAtHellas} from './MausoleumAtHellas';
import {StatueOfVonBraunOnOlympusMons} from './StatueOfVonBraunOnOlympusMons';
import {TharsisColossus} from './TharsisColossus';
import {TempleOfGaiaAtElysium} from './TempleOfGaiaAtElysium';
import {BattleOverMars} from './BattleOverMars';
import {LivestockGiantDome} from './LivestockGiantDome';
import {LightningAccumulators} from './LightningAccumulators';
import {MartianRangers} from './MartianRangers';
import {Bioreactors} from './Bioreactors';
import {NeptuneExpedition} from './NeptuneExpedition';
import {BiomassConversionPlant} from './BiomassConversionPlant';
import {OpeningOfNaturalReserves} from './OpeningOfNaturalReserves';
import {Clonation} from './Clonation';
import {MuskAwards} from './MuskAwards';
import {MonumentToMars} from './MonumentToMars';
import {SupernovaExplosion} from './SupernovaExplosion';
import {OrganicWasteRecycling} from './OrganicWasteRecycling';
import {SmesTechnology} from './SmesTechnology';
import {TharsisPumpingHub} from './TharsisPumpingHub';
import {PlanetaryMuseum} from './PlanetaryMuseum';
import {GreatMartianArchives} from './GreatMartianArchives';
import {MicrobioticOceanicFauna} from './MicrobioticOceanicFauna';
import {ObservatoryOnOlympusMons} from './ObservatoryOnOlympusMons';
import {PrehistoricBeasts} from './PrehistoricBeasts';
import {GigaInterferometer} from './GigaInterferometer';
import {MartianCommercialSeafleet} from './MartianCommercialSeafleet';
import {DataLibrary} from './DataLibrary';
import {MineralDepot} from './MineralDepot';
import {HeavyMachinery} from './HeavyMachinery';
import {SedimentaryRocks} from './SedimentaryRocks';
import {ExtraVehicularActivities} from './ExtraVehicularActivities';
import {OrbitalBiologicalLaboratory} from './OrbitalBiologicalLaboratory';
import {SpaceRobots} from './SpaceRobots';
import {AlgorithmicTrading} from './AlgorithmicTrading';
import {Ecoplants} from './Ecoplants';
import {MiningOutpost} from './MiningOutpost';
import {ExportsFromAmalthea} from './ExportsFromAmalthea';
import {InterplanetaryCruise} from './InterplanetaryCruise';
import {MoonMineralMetropolis} from './MoonMineralMetropolis';
import {MeteorShower} from './MeteorShower';
import {ElectoralCampaign} from './ElectoralCampaign';
import {TaxTheRich} from './TaxTheRich';

export const ROB_ANTILLES_CARD_MANIFEST = new ModuleManifest({
  module: 'robAntilles',
  projectCards: {
    [CardName.SUBURBS]: {Factory: Suburbs},
    [CardName.HARBOR_BOREALIS]: {Factory: HarborBorealis, compatibility: 'pathfinders'},
    [CardName.HISTORICAL_VIDEOGRAPHIC_ARCHIVE]: {Factory: HistoricalVideographicArchive},
    [CardName.INDUSTRIAL_METROPOLIS]: {Factory: IndustrialMetropolis},
    [CardName.ORC_TURBINES]: {Factory: OrcTurbines},
    [CardName.PARADISE_CITY]: {Factory: ParadiseCity},
    [CardName.CACTI]: {Factory: Cacti},
    [CardName.ALIEN_REACTOR_ATIVATION]: {Factory: AlienReactorAtivation},
    [CardName.HUMPBACK_WHALES]: {Factory: HumpbackWhales},
    [CardName.MOBILE_BIOLOGICAL_DOME]: {Factory: MobileBiologicalDome, compatibility: ['turmoil', 'moreParties']},
    [CardName.GREENHOUSE_LIGHTS]: {Factory: GreenhouseLights, compatibility: ['turmoil', 'moreParties']},
    [CardName.CORRUPTED_DELEGATE]: {Factory: CorruptedDelegate, compatibility: ['turmoil', 'moreParties']},
    [CardName.UPGRADED_SAWS]: {Factory: UpgradedSaws},
    [CardName.LAUNCH_OF_THE_PHOENIX]: {Factory: LaunchOfThePhoenix},
    [CardName.UTOPIA_PLANITIA_SPACEPORT]: {Factory: UtopiaPlanitiaSpaceport, compatibility: ['turmoil', 'pathfinders']},
    [CardName.MARTIAN_ARMED_FORCES]: {Factory: MartianArmedForces},
    [CardName.EXCAVATION_SYRIA_PLANUM]: {Factory: ExcavationSyriaPlanum},
    [CardName.WEATHER_CONTROL_TOWER]: {Factory: WeatherControlTower},
    [CardName.CLOUD_CITY_RA]: {Factory: CloudCityRA, compatibility: 'venus'},
    [CardName.BATTLE_OF_ZADONGA]: {Factory: BattleOfZadonga},
    [CardName.DOGS_IN_SPACE]: {Factory: DogsInSpace},
    [CardName.STEM_CELL_RESEARCH_CENTER]: {Factory: StemCellResearchCenter},
    [CardName.TROPOSPHERIC_CITY]: {Factory: TroposphericCity, compatibility: 'venus'},
    [CardName.TERRAFORMING_BUREAU_RESTRUCTURING]: {Factory: TerraformingBureauRestructuring, compatibility: ['turmoil', 'moreParties']},
    [CardName.ROOFTOP_GARDENS_OF_NOCTIS]: {Factory: RooftopGardensOfNoctis, compatibility: 'pathfinders'},
    [CardName.GREAT_LIGHTHOUSE_OF_ALBA_PATERA]: {Factory: GreatLighthouseOfAlbaPatera, compatibility: 'pathfinders'},
    [CardName.GREAT_FACE_OF_CYDONIA]: {Factory: GreatFaceOfCydonia, compatibility: 'pathfinders'},
    [CardName.MAUSOLEUM_AT_HELLAS]: {Factory: MausoleumAtHellas, compatibility: 'pathfinders'},
    [CardName.STATUE_OF_VON_BRAUN_ON_OLYMPUS_MONS]: {Factory: StatueOfVonBraunOnOlympusMons, compatibility: 'pathfinders'},
    [CardName.THARSIS_COLOSSUS]: {Factory: TharsisColossus, compatibility: ['turmoil', 'pathfinders']},
    [CardName.TEMPLE_OF_GAIA_AT_ELYSIUM]: {Factory: TempleOfGaiaAtElysium, compatibility: ['turmoil', 'pathfinders']},
    [CardName.BATTLE_OVER_MARS]: {Factory: BattleOverMars},
    [CardName.LIVESTOCK_GIANT_DOME]: {Factory: LivestockGiantDome},
    [CardName.LIGHTNING_ACCUMULATORS]: {Factory: LightningAccumulators},
    [CardName.MARTIAN_RANGERS]: {Factory: MartianRangers},
    [CardName.BIOREACTORS_RA]: {Factory: Bioreactors},
    [CardName.NEPTUNE_EXPEDITION]: {Factory: NeptuneExpedition},
    [CardName.BIOMASS_CONVERSION_PLANT]: {Factory: BiomassConversionPlant},
    [CardName.OPENING_OF_NATURAL_RESERVES]: {Factory: OpeningOfNaturalReserves},
    [CardName.CLONATION]: {Factory: Clonation, compatibility: 'turmoil'},
    [CardName.MUSK_AWARDS]: {Factory: MuskAwards},
    [CardName.MONUMENT_TO_MARS]: {Factory: MonumentToMars},
    [CardName.SUPERNOVA_EXPLOSION]: {Factory: SupernovaExplosion},
    [CardName.ORGANIC_WASTE_RECYCLING]: {Factory: OrganicWasteRecycling},
    [CardName.SMES_TECHNOLOGY]: {Factory: SmesTechnology},
    [CardName.THARSIS_PUMPING_HUB]: {Factory: TharsisPumpingHub, compatibility: 'pathfinders'},
    [CardName.PLANETARY_MUSEUM]: {Factory: PlanetaryMuseum},
    [CardName.GREAT_MARTIAN_ARCHIVES]: {Factory: GreatMartianArchives, compatibility: ['turmoil', 'moreParties']},
    [CardName.MICROBIOTIC_OCEANIC_FAUNA]: {Factory: MicrobioticOceanicFauna},
    [CardName.OBSERVATORY_ON_OLYMPUS_MONS]: {Factory: ObservatoryOnOlympusMons, compatibility: 'pathfinders'},
    [CardName.PREHISTORIC_BEASTS]: {Factory: PrehistoricBeasts},
    [CardName.GIGA_INTERFEROMETER]: {Factory: GigaInterferometer},
    [CardName.MARTIAN_COMMERCIAL_SEAFLEET]: {Factory: MartianCommercialSeafleet},
    [CardName.DATA_LIBRARY]: {Factory: DataLibrary},
    [CardName.MINERAL_DEPOT]: {Factory: MineralDepot},
    [CardName.HEAVY_MACHINERY]: {Factory: HeavyMachinery},
    [CardName.SEDIMENTARY_ROCKS]: {Factory: SedimentaryRocks},
    [CardName.EXTRA_VEHICULAR_ACTIVITIES]: {Factory: ExtraVehicularActivities},
    [CardName.ORBITAL_BIOLOGICAL_LABORATORY]: {Factory: OrbitalBiologicalLaboratory},
    [CardName.SPACE_ROBOTS]: {Factory: SpaceRobots},
    [CardName.ALGORITHMIC_TRADING]: {Factory: AlgorithmicTrading},
    [CardName.ECOPLANTS]: {Factory: Ecoplants},
    [CardName.MINING_OUTPOST]: {Factory: MiningOutpost},
    [CardName.EXPORTS_FROM_AMALTHEA]: {Factory: ExportsFromAmalthea},
    [CardName.INTERPLANETARY_CRUISE]: {Factory: InterplanetaryCruise},
    [CardName.MOON_MINERAL_METROPOLIS]: {Factory: MoonMineralMetropolis, compatibility: 'moon'},
    [CardName.METEOR_SHOWER_RA]: {Factory: MeteorShower},
    [CardName.ELECTORAL_CAMPAIGN]: {Factory: ElectoralCampaign, compatibility: ['turmoil', 'moreParties']},
    [CardName.TAX_THE_RICH]: {Factory: TaxTheRich, compatibility: ['turmoil', 'moreParties']},
  },
  // Both are near-exact mechanical duplicates of an existing sillyfication card (same
  // resource type, same trigger, same VP scaling). If both fan modules are active,
  // sillyfication's version wins and the Rob Antilles one is removed from the deck.
  //  - Dogs in Space vs. Uranus Sea Creatures: Animal resource, gained when any player
  //    plays a tag from the same family (Space vs. Jovian) including this card, VP per animal.
  //  - Mobile Biological Dome vs. Evergreen Forest: Seed resource (used nowhere else in the
  //    codebase), party-gated, seeds accumulate during production and periodically convert
  //    to a board benefit.
  conditionalCardsToRemove: new Map([
    [CardName.DOGS_IN_SPACE, CardName.URANUS_SEA_CREATURES],
    [CardName.MOBILE_BIOLOGICAL_DOME, CardName.EVERGREEN_FOREST],
  ]),
});
