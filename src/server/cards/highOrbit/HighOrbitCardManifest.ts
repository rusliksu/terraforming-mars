import {CardName} from '../../../common/cards/CardName';
import {ModuleManifest} from '../ModuleManifest';
import {SpaceTradingStation} from './SpaceTradingStation';
import {OrbitalHeadquarters} from './OrbitalHeadquarters';
import {Observatory} from './Observatory';
import {PropellantDepot} from './PropellantDepot';
import {AutoFactory} from './AutoFactory';
import {AsteroidMine} from './AsteroidMine';
import {Freighter} from './Freighter';
import {OrbitalShipyard} from './OrbitalShipyard';
import {NavigationalBeacon} from './NavigationalBeacon';
import {Comsat} from './Comsat';
import {WeatherSatellite} from './WeatherSatellite';
import {Hydroponics} from './Hydroponics';
import {SalvageDepot} from './SalvageDepot';
import {Powersat} from './Powersat';
import {PlanetaryOutpost} from './PlanetaryOutpost';
import {SpaceHabitat} from './SpaceHabitat';
import {ScienceFacility} from './ScienceFacility';
import {Probe} from './Probe';

export const HIGH_ORBIT_CARD_MANIFEST = new ModuleManifest({
  module: 'highOrbit',
  projectCards: {
    [CardName.SPACE_TRADING_STATION]: {Factory: SpaceTradingStation},
    [CardName.ORBITAL_HEADQUARTERS]: {Factory: OrbitalHeadquarters},
    [CardName.OBSERVATORY]: {Factory: Observatory},
    [CardName.PROPELLANT_DEPOT]: {Factory: PropellantDepot},
    [CardName.AUTO_FACTORY]: {Factory: AutoFactory},
    [CardName.ASTEROID_MINE]: {Factory: AsteroidMine},
    [CardName.FREIGHTER]: {Factory: Freighter},
    [CardName.ORBITAL_SHIPYARD]: {Factory: OrbitalShipyard},
    [CardName.NAVIGATIONAL_BEACON]: {Factory: NavigationalBeacon},
    [CardName.COMSAT]: {Factory: Comsat},
    [CardName.WEATHER_SATELLITE]: {Factory: WeatherSatellite},
    [CardName.HYDROPONICS]: {Factory: Hydroponics},
    [CardName.SALVAGE_DEPOT]: {Factory: SalvageDepot},
    [CardName.POWERSAT]: {Factory: Powersat},
    [CardName.PLANETARY_OUTPOST]: {Factory: PlanetaryOutpost},
    [CardName.SPACE_HABITAT]: {Factory: SpaceHabitat},
    [CardName.SCIENCE_FACILITY]: {Factory: ScienceFacility},
    [CardName.PROBE]: {Factory: Probe},
  },
});

/**
 * High Orbit (fan): remaining physical copies of each Infrastructure design available in the
 * shared supply at game start (not the project deck -- see GameCards.getProjectCards and
 * IGame.infrastructureSupply). Counts match the original "N copies" seen in the source material.
 */
export const HIGH_ORBIT_SUPPLY: Partial<Record<CardName, number>> = {
  [CardName.SPACE_TRADING_STATION]: 3,
  [CardName.ORBITAL_HEADQUARTERS]: 5,
  [CardName.OBSERVATORY]: 3,
  [CardName.PROPELLANT_DEPOT]: 3,
  [CardName.AUTO_FACTORY]: 3,
  [CardName.ASTEROID_MINE]: 5,
  [CardName.FREIGHTER]: 3,
  [CardName.ORBITAL_SHIPYARD]: 3,
  [CardName.NAVIGATIONAL_BEACON]: 3,
  [CardName.COMSAT]: 5,
  [CardName.WEATHER_SATELLITE]: 4,
  [CardName.HYDROPONICS]: 3,
  [CardName.SALVAGE_DEPOT]: 3,
  [CardName.POWERSAT]: 3,
  [CardName.PLANETARY_OUTPOST]: 5,
  [CardName.SPACE_HABITAT]: 3,
  [CardName.SCIENCE_FACILITY]: 4,
  [CardName.PROBE]: 5,
};
