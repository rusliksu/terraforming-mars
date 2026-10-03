import {CardName} from '../../../common/cards/CardName';
import {ModuleManifest} from '../ModuleManifest';
import {LunarBeamBetterMars} from './LunarBeamBetterMars';
import {LunaMetropolisBetterMars} from './LunaMetropolisBetterMars';
import {LunarExportsBetterMars} from './LunarExportsBetterMars';
import {PristarBetterMars} from './PristarBetterMars';
import {EarlySettlementBetterMars} from './EarlySettlementBetterMars';
import {SelfSufficientSettlementBetterMars} from './SelfSufficientSettlementBetterMars';
import {EosChasmaNationalParkBetterMars} from './EosChasmaNationalParkBetterMars';
import {ImmigrationShuttlesBetterMars} from './ImmigrationShuttlesBetterMars';
import {MartianRailsBetterMars} from './MartianRailsBetterMars';
import {NoctisCityBetterMars} from './NoctisCityBetterMars';
import {NoctisFarmingBetterMars} from './NoctisFarmingBetterMars';
import {ProtectedValleyBetterMars} from './ProtectedValleyBetterMars';
import {MarsUniversityBetterMars} from './MarsUniversityBetterMars';
import {ProtectedHabitatsBetterMars} from './ProtectedHabitatsBetterMars';
import {TropicalResortBetterMars} from './TropicalResortBetterMars';
import {MartianMediaCenterBetterMars} from './MartianMediaCenterBetterMars';
import {MeatIndustryBetterMars} from './MeatIndustryBetterMars';
import {LunarMiningBetterMars} from './LunarMiningBetterMars';
import {LunaGovernorBetterMars} from './LunaGovernorBetterMars';
import {PlanetPr} from '../pathfinders/PlanetPr';

/**
 * BetterMars: replaces a handful of official cards with tag-variant reworks
 * (an extra Mars tag, an Earth tag turned into a Moon tag, an Animal tag added
 * to a meat-industry card, etc). The base cards are
 * swapped out via `cardsToRemove` whenever this module is enabled.
 *
 * Planet PR is the one exception - it's not a rework of an existing card, just bundled
 * into this module's corporationCards (still requiring Pathfinders, via `compatibility`).
 */
export const BETTER_MARS_CARD_MANIFEST = new ModuleManifest({
  module: 'betterMars',
  corporationCards: {
    [CardName.PRISTAR_BETTER_MARS]: {Factory: PristarBetterMars, compatibility: ['turmoil', 'pathfinders']},
    [CardName.PLANET_PR]: {Factory: PlanetPr, compatibility: 'pathfinders'},
  },
  preludeCards: {
    [CardName.EARLY_SETTLEMENT_BETTER_MARS]: {Factory: EarlySettlementBetterMars, compatibility: ['prelude', 'pathfinders']},
    [CardName.SELF_SUFFICIENT_SETTLEMENT_BETTER_MARS]: {Factory: SelfSufficientSettlementBetterMars, compatibility: ['prelude', 'pathfinders']},
  },
  projectCards: {
    [CardName.LUNAR_BEAM_BETTER_MARS]: {Factory: LunarBeamBetterMars, compatibility: 'moon'},
    [CardName.LUNA_METROPOLIS_BETTER_MARS]: {Factory: LunaMetropolisBetterMars, compatibility: ['venus', 'moon']},
    [CardName.LUNAR_EXPORTS_BETTER_MARS]: {Factory: LunarExportsBetterMars, compatibility: ['colonies', 'moon']},
    // The rest of this row (through Tropical Resort) all add a Mars tag - a Pathfinders
    // concept (planetary tracks, and dozens of Pathfinders cards that count Mars tags) -
    // so they also require Pathfinders, on top of BetterMars itself.
    [CardName.EOS_CHASMA_NATIONAL_PARK_BETTER_MARS]: {Factory: EosChasmaNationalParkBetterMars, compatibility: 'pathfinders'},
    [CardName.IMMIGRATION_SHUTTLES_BETTER_MARS]: {Factory: ImmigrationShuttlesBetterMars, compatibility: 'pathfinders'},
    [CardName.MARTIAN_RAILS_BETTER_MARS]: {Factory: MartianRailsBetterMars, compatibility: 'pathfinders'},
    [CardName.NOCTIS_CITY_BETTER_MARS]: {Factory: NoctisCityBetterMars, compatibility: 'pathfinders'},
    [CardName.NOCTIS_FARMING_BETTER_MARS]: {Factory: NoctisFarmingBetterMars, compatibility: 'pathfinders'},
    [CardName.PROTECTED_VALLEY_BETTER_MARS]: {Factory: ProtectedValleyBetterMars, compatibility: 'pathfinders'},
    [CardName.MARS_UNIVERSITY_BETTER_MARS]: {Factory: MarsUniversityBetterMars, compatibility: 'pathfinders'},
    [CardName.PROTECTED_HABITATS_BETTER_MARS]: {Factory: ProtectedHabitatsBetterMars, compatibility: 'pathfinders'},
    [CardName.TROPICAL_RESORT_BETTER_MARS]: {Factory: TropicalResortBetterMars, compatibility: 'pathfinders'},
    [CardName.MARTIAN_MEDIA_CENTER_BETTER_MARS]: {Factory: MartianMediaCenterBetterMars, compatibility: ['turmoil', 'pathfinders']},
    // Meat Industry only adds an Animal tag, not a Mars tag - no Pathfinders requirement.
    [CardName.MEAT_INDUSTRY_BETTER_MARS]: {Factory: MeatIndustryBetterMars},
    [CardName.LUNAR_MINING_BETTER_MARS]: {Factory: LunarMiningBetterMars, compatibility: ['colonies', 'moon']},
    [CardName.LUNA_GOVERNOR_BETTER_MARS]: {Factory: LunaGovernorBetterMars, compatibility: ['colonies', 'moon']},
  },
  cardsToRemove: [
    CardName.MEAT_INDUSTRY,
  ],
  // These replacements each need an extra expansion on top of BetterMars itself (Moon,
  // Venus, Colonies, Turmoil, Prelude, or Pathfinders - see the Mars-tag comment above).
  // The base card only actually gets swapped out once its replacement clears that extra
  // requirement too - otherwise the base card stays, so a game without (say) the Moon
  // expansion still has a normal Earth-tag Lunar Beam instead of neither version.
  conditionalCardsToRemove: new Map([
    [CardName.LUNAR_BEAM, CardName.LUNAR_BEAM_BETTER_MARS],
    [CardName.LUNA_METROPOLIS, CardName.LUNA_METROPOLIS_BETTER_MARS],
    [CardName.LUNAR_EXPORTS, CardName.LUNAR_EXPORTS_BETTER_MARS],
    [CardName.PRISTAR, CardName.PRISTAR_BETTER_MARS],
    [CardName.EARLY_SETTLEMENT, CardName.EARLY_SETTLEMENT_BETTER_MARS],
    [CardName.SELF_SUFFICIENT_SETTLEMENT, CardName.SELF_SUFFICIENT_SETTLEMENT_BETTER_MARS],
    [CardName.EOS_CHASMA_NATIONAL_PARK, CardName.EOS_CHASMA_NATIONAL_PARK_BETTER_MARS],
    [CardName.IMMIGRATION_SHUTTLES, CardName.IMMIGRATION_SHUTTLES_BETTER_MARS],
    [CardName.MARTIAN_RAILS, CardName.MARTIAN_RAILS_BETTER_MARS],
    [CardName.NOCTIS_CITY, CardName.NOCTIS_CITY_BETTER_MARS],
    [CardName.NOCTIS_FARMING, CardName.NOCTIS_FARMING_BETTER_MARS],
    [CardName.PROTECTED_VALLEY, CardName.PROTECTED_VALLEY_BETTER_MARS],
    [CardName.MARS_UNIVERSITY, CardName.MARS_UNIVERSITY_BETTER_MARS],
    [CardName.PROTECTED_HABITATS, CardName.PROTECTED_HABITATS_BETTER_MARS],
    [CardName.TROPICAL_RESORT, CardName.TROPICAL_RESORT_BETTER_MARS],
    [CardName.MARTIAN_MEDIA_CENTER, CardName.MARTIAN_MEDIA_CENTER_BETTER_MARS],
    [CardName.LUNAR_MINING, CardName.LUNAR_MINING_BETTER_MARS],
    [CardName.LUNA_GOVERNOR, CardName.LUNA_GOVERNOR_BETTER_MARS],
  ]),
});
