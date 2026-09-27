import {CardName} from '../../../common/cards/CardName';
import {ModuleManifest} from '../ModuleManifest';
import {DeltaProject} from './DeltaProject';
import {QuantumResearch} from './QuantumResearch';
import {DeltaSurge} from './DeltaSurge';
import {CorporateEspionage} from './CorporateEspionage';
import {DeltaWorks} from './DeltaWorks';
import {DevelopmentManager} from './DevelopmentManager';
import {DutchMountains} from './DutchMountains';
import {DynamicOceanBarrier} from './DynamicOceanBarrier';
import {LittleDutchBoy} from './LittleDutchBoy';
import {SocialHeating} from './SocialHeating';
import {StormSurgeBarrier} from './StormSurgeBarrier';

export const DELTA_PROJECT_CARD_MANIFEST = new ModuleManifest({
  module: 'deltaProject',
  preludeCards: {
    // Force-dealt directly to every player in Game.ts (`new DeltaProject()`), not drawn
    // from the shared prelude pool - instantiate: false keeps it out of
    // GameCards.getPreludeCards() (and so out of the real preludeDeck), while this entry
    // still lets other deltaProject-compatible cards find it registered here.
    [CardName.DELTA_PROJECT]: {Factory: DeltaProject, instantiate: false},
  },
  projectCards: {
    [CardName.QUANTUM_RESEARCH]: {Factory: QuantumResearch},
    [CardName.DELTA_SURGE]: {Factory: DeltaSurge},
    [CardName.CORPORATE_ESPIONAGE]: {Factory: CorporateEspionage},
    [CardName.DELTA_WORKS]: {Factory: DeltaWorks},
    [CardName.DEVELOPMENT_MANAGER]: {Factory: DevelopmentManager},
    [CardName.DUTCH_MOUNTAINS]: {Factory: DutchMountains},
    [CardName.DYNAMIC_OCEAN_BARRIER]: {Factory: DynamicOceanBarrier},
    [CardName.LITTLE_DUTCH_BOY]: {Factory: LittleDutchBoy},
    [CardName.SOCIAL_HEATING]: {Factory: SocialHeating},
    [CardName.STORM_SURGE_BARRIER]: {Factory: StormSurgeBarrier},
  },
});
