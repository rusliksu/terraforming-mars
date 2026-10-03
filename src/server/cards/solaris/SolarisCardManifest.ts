import {ModuleManifest} from '../ModuleManifest';
import {CardName} from '../../../common/cards/CardName';
import {AntiFraudInvestigation} from './AntiFraudInvestigation';
import {AceVeteranSquad} from './AceVeteranSquad';
import {GalaxyDefenders} from './GalaxyDefenders';
import {Mothership} from './Mothership';
import {HypersonicFighters} from './HypersonicFighters';
import {ShieldingDrones} from './ShieldingDrones';
import {Sideralis} from './Sideralis';
import {Stellatron} from './Stellatron';
import {BionicAugmentations} from './BionicAugmentations';
import {SyntheticBrainCells} from './SyntheticBrainCells';
import {BuildingDeregulation} from './BuildingDeregulation';
import {PowerLinesHub} from './PowerLinesHub';
import {CondensationPlant} from './CondensationPlant';
import {WasteIncinerator} from './WasteIncinerator';
import {Plebiscite} from './Plebiscite';
import {StellarEngine} from './StellarEngine';
import {MartianCensus} from './MartianCensus';
import {CompanyNationalization} from './CompanyNationalization';
import {TerrainLease} from './TerrainLease';
import {SynergisticForests} from './SynergisticForests';
import {WanderingStationHermes} from './WanderingStationHermes';
import {FirstManMonument} from './FirstManMonument';
import {AwardCelebration} from './AwardCelebration';
import {Bribery} from './Bribery';
import {MarsAcademyOfPoliticalSciences} from './MarsAcademyOfPoliticalSciences';
import {ImmigrationBureau} from './ImmigrationBureau';
import {SelfReplicatingRobotsSolaris} from './SelfReplicatingRobotsSolaris';
import {AtmosphericCompressor} from './AtmosphericCompressor';
import {OrbitalHydrogeologicCannon} from './OrbitalHydrogeologicCannon';
import {ExtraplanetaryUrbanizator} from './ExtraplanetaryUrbanizator';
import {EinsteinRosenGateway} from './EinsteinRosenGateway';
import {PlanetaryCoreInductor} from './PlanetaryCoreInductor';
import {SyntheticGargantuaTrees} from './SyntheticGargantuaTrees';
import {ArtificialMoon} from './ArtificialMoon';
import {SpaceTelescope} from './SpaceTelescope';
import {Flagship} from './Flagship';
import {RedistributionOfWealth} from './RedistributionOfWealth';
import {Cyborgs} from './Cyborgs';
import {StrongArtificialIntelligence} from './StrongArtificialIntelligence';
import {ColdFusionTechnology} from './ColdFusionTechnology';
import {GiantIndustrialComplex} from './GiantIndustrialComplex';
import {MartianAgriculture} from './MartianAgriculture';
import {TradeAgreements} from './TradeAgreements';
import {WishMachine} from './WishMachine';
import {ManagementCrisis} from './ManagementCrisis';
import {EnergyAcquisition} from './EnergyAcquisition';

export const SOLARIS_CARD_MANIFEST = new ModuleManifest({
  module: 'solaris',
  projectCards: {
    [CardName.ANTI_FRAUD_INVESTIGATION]: {Factory: AntiFraudInvestigation, compatibility: ['turmoil', 'moreParties']},
    [CardName.ACE_VETERAN_SQUAD]: {Factory: AceVeteranSquad},
    [CardName.GALAXY_DEFENDERS]: {Factory: GalaxyDefenders},
    [CardName.MOTHERSHIP]: {Factory: Mothership},
    [CardName.HYPERSONIC_FIGHTERS]: {Factory: HypersonicFighters},
    [CardName.SHIELDING_DRONES]: {Factory: ShieldingDrones},

    [CardName.SIDERALIS]: {Factory: Sideralis, compatibility: 'moon'},
    [CardName.STELLATRON]: {Factory: Stellatron, compatibility: 'venus'},
    [CardName.BIONIC_AUGMENTATIONS]: {Factory: BionicAugmentations, compatibility: ['turmoil', 'moreParties']},
    [CardName.SYNTHETIC_BRAIN_CELLS]: {Factory: SyntheticBrainCells, compatibility: ['turmoil', 'moreParties']},
    [CardName.BUILDING_DEREGULATION]: {Factory: BuildingDeregulation, compatibility: ['turmoil', 'moreParties', 'industries']},
    [CardName.POWER_LINES_HUB]: {Factory: PowerLinesHub, compatibility: ['turmoil', 'moreParties']},
    [CardName.CONDENSATION_PLANT]: {Factory: CondensationPlant, compatibility: 'turmoil'},
    [CardName.WASTE_INCINERATOR]: {Factory: WasteIncinerator, compatibility: 'turmoil'},
    [CardName.PLEBISCITE]: {Factory: Plebiscite, compatibility: 'turmoil'},
    [CardName.STELLAR_ENGINE]: {Factory: StellarEngine},

    [CardName.MARTIAN_CENSUS]: {Factory: MartianCensus, compatibility: ['turmoil', 'moreParties']},
    [CardName.COMPANY_NATIONALIZATION]: {Factory: CompanyNationalization, compatibility: 'turmoil'},
    [CardName.TERRAIN_LEASE]: {Factory: TerrainLease, compatibility: 'turmoil'},
    [CardName.SYNERGISTIC_FORESTS]: {Factory: SynergisticForests, compatibility: 'turmoil'},
    [CardName.WANDERING_STATION_HERMES]: {Factory: WanderingStationHermes, compatibility: ['turmoil', 'moreParties']},
    [CardName.FIRST_MAN_MONUMENT]: {Factory: FirstManMonument, compatibility: ['turmoil', 'moreParties']},
    [CardName.AWARD_CELEBRATION]: {Factory: AwardCelebration, compatibility: ['turmoil', 'moreParties']},
    [CardName.BRIBERY]: {Factory: Bribery, compatibility: ['turmoil', 'moreParties']},
    [CardName.MARS_ACADEMY_OF_POLITICAL_SCIENCES]: {Factory: MarsAcademyOfPoliticalSciences, compatibility: ['turmoil', 'moreParties']},
    [CardName.IMMIGRATION_BUREAU]: {Factory: ImmigrationBureau, compatibility: ['turmoil', 'moreParties']},

    [CardName.SELF_REPLICATING_ROBOTS_SOLARIS]: {Factory: SelfReplicatingRobotsSolaris},
    [CardName.ATMOSPHERIC_COMPRESSOR]: {Factory: AtmosphericCompressor},
    [CardName.ORBITAL_HYDROGEOLOGIC_CANNON]: {Factory: OrbitalHydrogeologicCannon},
    [CardName.EXTRAPLANETARY_URBANIZATOR]: {Factory: ExtraplanetaryUrbanizator},
    [CardName.EINSTEIN_ROSEN_GATEWAY]: {Factory: EinsteinRosenGateway, compatibility: 'colonies'},
    [CardName.PLANETARY_CORE_INDUCTOR]: {Factory: PlanetaryCoreInductor},
    [CardName.SYNTHETIC_GARGANTUA_TREES]: {Factory: SyntheticGargantuaTrees},
    [CardName.ARTIFICIAL_MOON]: {Factory: ArtificialMoon},
    [CardName.SPACE_TELESCOPE]: {Factory: SpaceTelescope},
    [CardName.FLAGSHIP]: {Factory: Flagship},

    [CardName.REDISTRIBUTION_OF_WEALTH]: {Factory: RedistributionOfWealth, compatibility: ['turmoil', 'moreParties']},
    [CardName.CYBORGS]: {Factory: Cyborgs, compatibility: ['turmoil', 'moreParties']},
    [CardName.STRONG_ARTIFICIAL_INTELLIGENCE]: {Factory: StrongArtificialIntelligence, compatibility: ['turmoil', 'moreParties']},
    [CardName.COLD_FUSION_TECHNOLOGY]: {Factory: ColdFusionTechnology, compatibility: ['turmoil', 'moreParties']},
    [CardName.GIANT_INDUSTRIAL_COMPLEX]: {Factory: GiantIndustrialComplex, compatibility: 'turmoil'},
    [CardName.MARTIAN_AGRICULTURE]: {Factory: MartianAgriculture, compatibility: ['turmoil', 'moreParties']},
    [CardName.TRADE_AGREEMENTS]: {Factory: TradeAgreements, compatibility: ['turmoil', 'colonies']},
    [CardName.WISH_MACHINE]: {Factory: WishMachine, compatibility: 'turmoil'},
    [CardName.MANAGEMENT_CRISIS]: {Factory: ManagementCrisis, compatibility: ['turmoil', 'moreParties']},
    [CardName.ENERGY_ACQUISITION]: {Factory: EnergyAcquisition, compatibility: ['turmoil', 'moreParties']},
  },
});
