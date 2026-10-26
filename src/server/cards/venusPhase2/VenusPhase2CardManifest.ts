import {CardName} from '../../../common/cards/CardName';
import {ModuleManifest} from '../ModuleManifest';
import {CloudCityStandardProject} from './CloudCityStandardProject';
import {GasMineStandardProject} from './GasMineStandardProject';
import {FloaterArrayStandardProject} from './FloaterArrayStandardProject';
import {OvdaRegioMassDriver} from './OvdaRegioMassDriver';
import {AtmoSequester} from './AtmoSequester';
import {SolarWindTrap} from './SolarWindTrap';
import {VenusianInfrastructures} from './VenusianInfrastructures';
import {SyntheticBiology} from './SyntheticBiology';
import {BioWasteReactor} from './BioWasteReactor';
import {InSituResourceUtilization} from './InSituResourceUtilization';
import {ImprovedFloatingSystems} from './ImprovedFloatingSystems';
import {ModularQuarters} from './ModularQuarters';
import {NegativeMassFluids} from './NegativeMassFluids';
import {TransmissionTowers} from './TransmissionTowers';
import {HeatTrappersNetwork} from './HeatTrappersNetwork';
import {DysonHarropSatellite} from './DysonHarropSatellite';
import {CoolingPillars} from './CoolingPillars';
import {IonicThrustersSupport} from './IonicThrustersSupport';
import {NativeMicrofauna} from './NativeMicrofauna';
import {Menagerie} from './Menagerie';
import {ComputationalBiology} from './ComputationalBiology';
import {Outskirts} from './Outskirts';
import {PollutionControl} from './PollutionControl';
import {InterplanetaryRoutes} from './InterplanetaryRoutes';
import {ArgonMine} from './ArgonMine';
import {IshtarOrbitingAcademy} from './IshtarOrbitingAcademy';
import {HighPressureSuits} from './HighPressureSuits';
import {NewAlexandria} from './NewAlexandria';
import {GasTurbines} from './GasTurbines';
import {SurveyorsTeam} from './SurveyorsTeam';
import {VenusAircraftHaven} from './VenusAircraftHaven';
import {VenusKickstarting} from './VenusKickstarting';
import {FloaterFactory} from './FloaterFactory';
import {StarwindIITradeship} from './StarwindIITradeship';
import {SisterColonies} from './SisterColonies';
import {VenusianResearchCommittee} from './VenusianResearchCommittee';
import {CallistoDockingStation} from './CallistoDockingStation';
import {XenonMine} from './XenonMine';
import {RadonMine} from './RadonMine';
import {KryptonMine} from './KryptonMine';
import {NewAthens} from './NewAthens';
import {AlphaRegioIncubators} from './AlphaRegioIncubators';
import {NewRome} from './NewRome';
import {VenusTradeship} from './VenusTradeship';
import {VenusianWanderer} from './VenusianWanderer';
import {AphroditeShuttleBase} from './AphroditeShuttleBase';
import {IshtarEnergyNetwork} from './IshtarEnergyNetwork';
import {NewBabylon} from './NewBabylon';

export const VENUS_PHASE_2_CARD_MANIFEST = new ModuleManifest({
  module: 'venusPhase2',
  standardProjects: {
    [CardName.CLOUD_CITY_STANDARD_PROJECT]: {Factory: CloudCityStandardProject},
    [CardName.GAS_MINE_STANDARD_PROJECT]: {Factory: GasMineStandardProject},
    [CardName.FLOATER_ARRAY_STANDARD_PROJECT]: {Factory: FloaterArrayStandardProject},
  },
  projectCards: {
    [CardName.OVDA_REGIO_MASS_DRIVER]: {Factory: OvdaRegioMassDriver},
    [CardName.ATMO_SEQUESTER]: {Factory: AtmoSequester},
    [CardName.SOLAR_WIND_TRAP]: {Factory: SolarWindTrap},
    [CardName.VENUSIAN_INFRASTRUCTURES]: {Factory: VenusianInfrastructures},
    [CardName.SYNTHETIC_BIOLOGY]: {Factory: SyntheticBiology},
    [CardName.BIO_WASTE_REACTOR]: {Factory: BioWasteReactor},
    [CardName.IN_SITU_RESOURCE_UTILIZATION]: {Factory: InSituResourceUtilization, compatibility: 'colonies'},
    [CardName.IMPROVED_FLOATING_SYSTEMS]: {Factory: ImprovedFloatingSystems},
    [CardName.MODULAR_QUARTERS]: {Factory: ModularQuarters},
    [CardName.NEGATIVE_MASS_FLUIDS]: {Factory: NegativeMassFluids},
    [CardName.TRANSMISSION_TOWERS]: {Factory: TransmissionTowers},
    [CardName.HEAT_TRAPPERS_NETWORK]: {Factory: HeatTrappersNetwork},
    [CardName.DYSON_HARROP_SATELLITE]: {Factory: DysonHarropSatellite},
    [CardName.COOLING_PILLARS]: {Factory: CoolingPillars},
    [CardName.IONIC_THRUSTERS_SUPPORT]: {Factory: IonicThrustersSupport},
    [CardName.NATIVE_MICROFAUNA]: {Factory: NativeMicrofauna},
    [CardName.MENAGERIE]: {Factory: Menagerie},
    [CardName.COMPUTATIONAL_BIOLOGY]: {Factory: ComputationalBiology},
    [CardName.OUTSKIRTS]: {Factory: Outskirts},
    [CardName.POLLUTION_CONTROL]: {Factory: PollutionControl},
    [CardName.INTERPLANETARY_ROUTES]: {Factory: InterplanetaryRoutes, compatibility: 'colonies'},
    [CardName.ARGON_MINE]: {Factory: ArgonMine},
    [CardName.ISHTAR_ORBITING_ACADEMY]: {Factory: IshtarOrbitingAcademy},
    [CardName.HIGH_PRESSURE_SUITS]: {Factory: HighPressureSuits},
    [CardName.NEW_ALEXANDRIA]: {Factory: NewAlexandria},
    [CardName.GAS_TURBINES]: {Factory: GasTurbines},
    [CardName.SURVEYORS_TEAM]: {Factory: SurveyorsTeam, compatibility: 'pathfinders'},
    [CardName.VENUS_AIRCRAFT_HAVEN]: {Factory: VenusAircraftHaven},
    [CardName.VENUS_KICKSTARTING]: {Factory: VenusKickstarting},
    [CardName.FLOATER_FACTORY]: {Factory: FloaterFactory},
    [CardName.STARWIND_II_TRADESHIP]: {Factory: StarwindIITradeship, compatibility: 'colonies'},
    [CardName.SISTER_COLONIES]: {Factory: SisterColonies, compatibility: 'colonies'},
    [CardName.VENUSIAN_RESEARCH_COMMITTEE]: {Factory: VenusianResearchCommittee},
    [CardName.CALLISTO_DOCKING_STATION]: {Factory: CallistoDockingStation},
    [CardName.XENON_MINE]: {Factory: XenonMine},
    [CardName.RADON_MINE]: {Factory: RadonMine},
    [CardName.KRYPTON_MINE]: {Factory: KryptonMine},
    [CardName.NEW_ATHENS]: {Factory: NewAthens},
    [CardName.ALPHA_REGIO_INCUBATORS]: {Factory: AlphaRegioIncubators},
    [CardName.NEW_ROME]: {Factory: NewRome},
    [CardName.VENUS_TRADESHIP]: {Factory: VenusTradeship},
    [CardName.VENUSIAN_WANDERER]: {Factory: VenusianWanderer},
    [CardName.APHRODITE_SHUTTLE_BASE]: {Factory: AphroditeShuttleBase},
    [CardName.ISHTAR_ENERGY_NETWORK]: {Factory: IshtarEnergyNetwork},
    [CardName.NEW_BABYLON]: {Factory: NewBabylon},
  },
});
