import {Terraformer} from './Terraformer';
import {Mayor} from './Mayor';
import {Gardener} from './Gardener';
import {Builder} from './Builder';
import {Builder7} from './Builder7';
import {Planner} from './Planner';
import {Hoverlord} from './Hoverlord';
import {IMilestone} from './IMilestone';
import {Generalist} from './Generalist';
import {Specialist} from './Specialist';
import {Ecologist} from './Ecologist';
import {Tycoon} from './Tycoon';
import {Legend} from './Legend';
import {Diversifier} from './Diversifier';
import {Tactician} from './Tactician';
import {PolarExplorer} from './PolarExplorer';
import {Energizer} from './Energizer';
import {RimSettler} from './RimSettler';
import {Networker} from './Networker';
import {OneGiantStep} from '../moon/OneGiantStep';
import {Lunarchitect} from '../moon/Lunarchitect';
import {Economizer} from './arabiaTerra/Economizer';
import {Pioneer} from './arabiaTerra/Pioneer';
import {Pioneer4} from './arabiaTerra/Pioneer4';
import {LandSpecialist} from './arabiaTerra/LandSpecialist';
import {Martian} from './arabiaTerra/Martian';
import {Capitalist} from './Capitalist';
import {VElectrician} from './VElectrician';
import {Coastguard, Irrigator} from './Irrigator';
import {Smith} from './Smith';
import {Tradesman} from './Tradesman';
import {Colonizer} from './amazonisPlanitia/Colonizer';
import {Minimalist} from './amazonisPlanitia/Minimalist';
import {Terran} from './amazonisPlanitia/Terran';
import {Tropicalist} from './amazonisPlanitia/Tropicalist';
import {Collector} from './terraCimmeria/Collector';
import {Firestarter} from './terraCimmeria/Firestarter';
import {Gambler} from './terraCimmeria/Gambler';
import {Spacefarer} from './terraCimmeria/Spacefarer';
import {TerraPioneer} from './terraCimmeria/TerraPioneer';
import {Risktaker} from './underworld/Risktaker';
import {Tunneler} from './underworld/Tunneler';
import {CForester, Forester} from './modular/Forester';
import {Fundraiser} from './modular/Fundraiser';
import {Geologist} from './modular/Geologist';
import {Landshaper} from './modular/Landshaper';
import {Philantropist} from './modular/Philantropist';
import {Planetologist} from './modular/Planetologist';
import {Producer} from './modular/Producer';
import {Researcher} from './modular/Researcher';
import {Sponsor} from './modular/Sponsor';
import {Lobbyist} from './modular/Lobbyist';
import {Farmer} from './modular/Farmer';
import {Engineer} from './modular/Engineer';
import {Hydrologist} from './modular/Hydrologist';
import {Thawer} from './modular/Thawer';
import {Purifier} from './Purifier';
import {VSpacefarer} from './VSpacefarer';
import {Agronomist} from './Agronomist';
import {Merchant} from './modular/Merchant';
import {MAManifest} from '../ma/MAManifest';
import {MilestoneName} from '../../common/ma/MilestoneName';
import {BoardName} from '../../common/boards/BoardName';
import {Architect} from './Architect';
import {Legend4} from './modular/Legend4';
import {Metallurgist} from './Metallurgist';
import {Spacefarer4} from './terraCimmeria/Spacefarer4';
import {Terraformer29} from './modular/Terraformer29';
import {Terran5} from './modular/Terran5';
import {Tycoon10} from './modular/Tycoon10';
import {Trader} from './modular/Trader';
import {Tactician4} from './modular/Tactician4';
import {Briber} from './Briber';
import {conglomeratesVariant} from './conglomerates/ConglomeratesMilestoneVariant';
import {GeneralistConglomerates} from './conglomerates/GeneralistConglomerates';
import {DiversifierConglomerates} from './conglomerates/DiversifierConglomerates';

/**
 * Maps each board milestone to its Conglomerates-scaled sibling (1.5x threshold, rounded up,
 * unless otherwise noted), swapped in for the board's slot only when the Conglomerates
 * expansion is on -- see MilestoneAwardSelector.ts. Deliberately absent:
 *  - `Minimalist` (Amazonis): a maximum (not minimum) threshold -- scaling it up would make it
 *    easier, not harder. Same documented-gap treatment as Merchant/Briber elsewhere in this
 *    module.
 *  - `Planetologist` (Terra Cimmeria Nova): its score is explicitly clamped to a maximum of 6
 *    in `getScore` (2 Earth + 2 Venus + 2 Jovian tags, capped), so a threshold above 6 would be
 *    unreachable by anyone.
 * `Generalist` (Elysium) is present, but NOT a 1.5x scale of the original -- its base score is
 * a 0-6 count of "productions increased at all," also hard-capped at 6, so it's redefined
 * instead (see GeneralistConglomerates): your team's COMBINED production of each of the 6
 * resources must be at least 2.
 * `Diversifier` is also NOT a straight 1.5x scale (that would be an unreachable 12, since a
 * base game only has 10 distinct tags) -- see DiversifierConglomerates, which unions the
 * team's distinct tags directly and claims at 10, the real ceiling.
 */
export const CONGLOMERATES_MILESTONE_MAP: Partial<Record<MilestoneName, MilestoneName>> = {
  'Agronomist': 'Agronomist6',
  'Architect': 'Architect5',
  'Builder': 'Builder12',
  'C. Forester': 'C. Forester5',
  'Capitalist': 'Capitalist96',
  'Coastguard': 'Coastguard5',
  'Colonizer': 'Colonizer6',
  'Diversifier': 'Diversifier10',
  'Ecologist': 'Ecologist6',
  'Economizer': 'Economizer8',
  'Energizer': 'Energizer9',
  'Engineer': 'Engineer15',
  'Farmer': 'Farmer8',
  'Firestarter': 'Firestarter30',
  'Forester': 'Forester6',
  'Fundraiser': 'Fundraiser18',
  'Gambler': 'Gambler3',
  'Gardener': 'Gardener5',
  'Generalist': 'Generalist2',
  'Geologist': 'Geologist5',
  'Irrigator': 'Irrigator6',
  'Land Specialist': 'Land Specialist5',
  'Legend': 'Legend8',
  'Martian': 'Martian6',
  'Mayor': 'Mayor5',
  'Pioneer': 'Pioneer5',
  'Planner': 'Planner24',
  'Polar Explorer': 'Polar Explorer5',
  'Researcher': 'Researcher6',
  'Rim Settler': 'Rim Settler5',
  'Smith': 'Smith9',
  'Spacefarer': 'Spacefarer9',
  'Specialist': 'Specialist15',
  'T. Collector': 'T. Collector5',
  'Tactician': 'Tactician8',
  'Terra Pioneer': 'Terra Pioneer8',
  'Terraformer': 'Terraformer53',
  'Terran': 'Terran9',
  'Tradesman': 'Tradesman5',
  'Tropicalist': 'Tropicalist5',
  'Tycoon': 'Tycoon23',
  'V. Electrician': 'V. Electrician6',
  'V. Spacefarer': 'V. Spacefarer6',
  'Hoverlord': 'Hoverlord11',
  'Hydrologist': 'Hydrologist6',
  'Landshaper': 'Landshaper5',
  'Lobbyist': 'Lobbyist11',
  'Lunarchitect': 'Lunarchitect9',
  'Metallurgist': 'Metallurgist9',
  'Networker': 'Networker5',
  'One Giant Step': 'One Giant Step9',
  'Philantropist': 'Philantropist8',
  'Producer': 'Producer24',
  'Purifier': 'Purifier5',
  'Risktaker': 'Risktaker5',
  'Sponsor': 'Sponsor5',
  'Thawer': 'Thawer8',
  'Trader': 'Trader5',
  'Tunneler': 'Tunneler11',
};

export const milestoneManifest: MAManifest<MilestoneName, IMilestone> = {
  all: {
    'Agronomist': {Factory: Agronomist},
    'Architect': {Factory: Architect},
    'Briber': {Factory: Briber, random: 'modular'},
    'Builder': {Factory: Builder},
    'Builder7': {Factory: Builder7, random: 'modular'},
    'C. Forester': {Factory: CForester},
    'Capitalist': {Factory: Capitalist},
    'Coastguard': {Factory: Coastguard, random: 'modular'},
    'Colonizer': {Factory: Colonizer, compatibility: 'colonies'},
    'Diversifier': {Factory: Diversifier, random: 'modular'},
    'Ecologist': {Factory: Ecologist, random: 'both'},
    'Economizer': {Factory: Economizer},
    'Energizer': {Factory: Energizer, random: 'both'},
    'Engineer': {Factory: Engineer, random: 'modular'},
    'Farmer': {Factory: Farmer, random: 'modular'},
    'Firestarter': {Factory: Firestarter},
    'Forester': {Factory: Forester, deprecated: true},
    'Fundraiser': {Factory: Fundraiser, random: 'modular'},
    'Gambler': {Factory: Gambler},
    'Gardener': {Factory: Gardener, random: 'both'},
    'Generalist': {Factory: Generalist, random: 'both'},
    'Geologist': {Factory: Geologist, random: 'modular'},
    'Hoverlord': {Factory: Hoverlord, compatibility: 'venus'},
    'Hydrologist': {Factory: Hydrologist, random: 'modular'},
    'Irrigator': {Factory: Irrigator, deprecated: true},
    'Land Specialist': {Factory: LandSpecialist},
    'Landshaper': {Factory: Landshaper, random: 'modular'},
    'Legend': {Factory: Legend},
    'Legend4': {Factory: Legend4, random: 'modular'},
    'Lobbyist': {Factory: Lobbyist, compatibility: 'turmoil', random: 'modular'},
    'Lunarchitect': {Factory: Lunarchitect, compatibility: 'moon'},
    'Martian': {Factory: Martian, compatibility: 'pathfinders'},
    'Mayor': {Factory: Mayor, random: 'both'},
    'Merchant': {Factory: Merchant, random: 'modular'},
    'Metallurgist': {Factory: Metallurgist, random: 'modular'},
    'Minimalist': {Factory: Minimalist},
    'Networker': {Factory: Networker, compatibility: 'ares'},
    'One Giant Step': {Factory: OneGiantStep, compatibility: 'moon'},
    'Philantropist': {Factory: Philantropist, random: 'modular'},
    'Pioneer': {Factory: Pioneer, compatibility: 'colonies'},
    'Pioneer4': {Factory: Pioneer4, compatibility: 'colonies', random: 'modular'},
    'Planetologist': {Factory: Planetologist, compatibility: 'venus', random: 'modular'},
    'Planner': {Factory: Planner, random: 'both'},
    'Polar Explorer': {Factory: PolarExplorer},
    'Producer': {Factory: Producer, random: 'modular'},
    'Purifier': {Factory: Purifier, compatibility: 'ares'},
    'Researcher': {Factory: Researcher, random: 'modular'},
    'Rim Settler': {Factory: RimSettler, random: 'both'},
    'Risktaker': {Factory: Risktaker, compatibility: 'underworld'},
    'Smith': {Factory: Smith},
    'Spacefarer': {Factory: Spacefarer},
    'Spacefarer4': {Factory: Spacefarer4, random: 'modular'},
    'Specialist': {Factory: Specialist},
    'Sponsor': {Factory: Sponsor, random: 'modular'},
    'T. Collector': {Factory: Collector},
    'Tactician': {Factory: Tactician},
    'Tactician4': {Factory: Tactician4, random: 'modular'},
    'Terra Pioneer': {Factory: TerraPioneer},
    'Terraformer': {Factory: Terraformer},
    'Terraformer29': {Factory: Terraformer29, random: 'modular'},
    'Terran': {Factory: Terran},
    'Terran5': {Factory: Terran5, random: 'modular'},
    'Thawer': {Factory: Thawer, random: 'modular'},
    'Trader': {Factory: Trader, random: 'modular'},
    'Tradesman': {Factory: Tradesman},
    'Tropicalist': {Factory: Tropicalist},
    'Tunneler': {Factory: Tunneler, compatibility: 'underworld'},
    'Tycoon': {Factory: Tycoon},
    'Tycoon10': {Factory: Tycoon10, random: 'modular'},
    'V. Electrician': {Factory: VElectrician},
    'V. Spacefarer': {Factory: VSpacefarer},

    // Conglomerates-scaled variants. Never drawn randomly (no `random` field, and explicitly
    // excluded in MilestoneAwardSelector.getCandidates) -- only ever reached via
    // CONGLOMERATES_MILESTONE_MAP swapping in for a board's fixed slot.
    'Agronomist6': {Factory: conglomeratesVariant('Agronomist6', 'Have 6 plant tags in play between you and your teammate', () => new Agronomist()), compatibility: 'conglomerates'},
    'Architect5': {Factory: conglomeratesVariant('Architect5', 'Have 5 city tags in play between you and your teammate', () => new Architect()), compatibility: 'conglomerates'},
    'Builder12': {Factory: conglomeratesVariant('Builder12', 'Have 12 building tags in play between you and your teammate', () => new Builder()), compatibility: 'conglomerates'},
    'C. Forester5': {Factory: conglomeratesVariant('C. Forester5', 'Have 5 plant production between you and your teammate', () => new CForester()), compatibility: 'conglomerates'},
    'Capitalist96': {Factory: conglomeratesVariant('Capitalist96', 'Have 96 M€ between you and your teammate', () => new Capitalist()), compatibility: 'conglomerates'},
    'Coastguard5': {Factory: conglomeratesVariant('Coastguard5', 'Own 5 tiles adjacent to oceans between you and your teammate', () => new Coastguard()), compatibility: 'conglomerates'},
    'Colonizer6': {Factory: conglomeratesVariant('Colonizer6', 'Have 6 colonies between you and your teammate', () => new Colonizer()), compatibility: 'conglomerates'},
    'Diversifier10': {Factory: DiversifierConglomerates, compatibility: 'conglomerates'},
    'Ecologist6': {Factory: conglomeratesVariant('Ecologist6', 'Have 6 bio tags in play between you and your teammate (plant, microbe and animal tags count as bio tags)', () => new Ecologist()), compatibility: 'conglomerates'},
    'Economizer8': {Factory: conglomeratesVariant('Economizer8', 'Have 8 heat production between you and your teammate', () => new Economizer()), compatibility: 'conglomerates'},
    'Energizer9': {Factory: conglomeratesVariant('Energizer9', 'Have 9 energy production between you and your teammate', () => new Energizer()), compatibility: 'conglomerates'},
    'Engineer15': {Factory: conglomeratesVariant('Engineer15', 'Have a total of 15 energy and heat production between you and your teammate', () => new Engineer()), compatibility: 'conglomerates'},
    'Farmer8': {Factory: conglomeratesVariant('Farmer8', 'Have 8 animal and microbe resources on your cards between you and your teammate', () => new Farmer()), compatibility: 'conglomerates'},
    'Firestarter30': {Factory: conglomeratesVariant('Firestarter30', 'Have 30 heat between you and your teammate', () => new Firestarter()), compatibility: 'conglomerates'},
    'Forester6': {Factory: conglomeratesVariant('Forester6', 'Have 6 plant production between you and your teammate', () => new Forester()), compatibility: 'conglomerates'},
    'Fundraiser18': {Factory: conglomeratesVariant('Fundraiser18', 'Have 18 M€ production between you and your teammate', () => new Fundraiser()), compatibility: 'conglomerates'},
    'Gambler3': {Factory: conglomeratesVariant('Gambler3', 'Fund 3 awards between you and your teammate', () => new Gambler()), compatibility: 'conglomerates'},
    'Gardener5': {Factory: conglomeratesVariant('Gardener5', 'Own 5 greenery tiles between you and your teammate', () => new Gardener()), compatibility: 'conglomerates'},
    'Generalist2': {Factory: GeneralistConglomerates, compatibility: 'conglomerates'},
    'Geologist5': {Factory: conglomeratesVariant('Geologist5', 'Own 5 tiles ON or ADJACENT to volcanic areas between you and your teammate', () => new Geologist()), compatibility: 'conglomerates'},
    'Irrigator6': {Factory: conglomeratesVariant('Irrigator6', 'Own 6 tiles adjacent to oceans between you and your teammate', () => new Irrigator()), compatibility: 'conglomerates'},
    'Land Specialist5': {Factory: conglomeratesVariant('Land Specialist5', 'Own 5 special (normally, brown) tiles between you and your teammate', () => new LandSpecialist()), compatibility: 'conglomerates'},
    'Legend8': {Factory: conglomeratesVariant('Legend8', 'Have 8 cards in your event pile between you and your teammate', () => new Legend()), compatibility: 'conglomerates'},
    'Martian6': {Factory: conglomeratesVariant('Martian6', 'Have 6 Mars tags in play between you and your teammate', () => new Martian()), compatibility: 'conglomerates'},
    'Mayor5': {Factory: conglomeratesVariant('Mayor5', 'Own 5 city tiles between you and your teammate', () => new Mayor()), compatibility: 'conglomerates'},
    'Pioneer5': {Factory: conglomeratesVariant('Pioneer5', 'Have 5 colonies between you and your teammate', () => new Pioneer()), compatibility: 'conglomerates'},
    'Planner24': {Factory: conglomeratesVariant('Planner24', 'Have 24 cards in your hand between you and your teammate', () => new Planner()), compatibility: 'conglomerates'},
    'Polar Explorer5': {Factory: conglomeratesVariant('Polar Explorer5', 'Own 5 tiles on the two bottom rows between you and your teammate', () => new PolarExplorer()), compatibility: 'conglomerates'},
    'Researcher6': {Factory: conglomeratesVariant('Researcher6', 'Have 6 science tags in play between you and your teammate', () => new Researcher()), compatibility: 'conglomerates'},
    'Rim Settler5': {Factory: conglomeratesVariant('Rim Settler5', 'Have 5 Jovian tags in play between you and your teammate', () => new RimSettler()), compatibility: 'conglomerates'},
    'Smith9': {Factory: conglomeratesVariant('Smith9', 'Have a total of 9 steel and titanium production between you and your teammate', () => new Smith()), compatibility: 'conglomerates'},
    'Spacefarer9': {Factory: conglomeratesVariant('Spacefarer9', 'Have 9 space tags in play between you and your teammate', () => new Spacefarer()), compatibility: 'conglomerates'},
    'Specialist15': {Factory: conglomeratesVariant('Specialist15', 'Have 15 in production of any resource between you and your teammate', () => new Specialist()), compatibility: 'conglomerates'},
    'T. Collector5': {Factory: conglomeratesVariant('T. Collector5', 'Have 5 sets of automated (green), active (blue) and event (red) project cards in play between you and your teammate', () => new Collector()), compatibility: 'conglomerates'},
    'Tactician8': {Factory: conglomeratesVariant('Tactician8', 'Have 8 cards with requirements in play between you and your teammate', () => new Tactician()), compatibility: 'conglomerates'},
    'Terra Pioneer8': {Factory: conglomeratesVariant('Terra Pioneer8', 'Own 8 tiles on Mars between you and your teammate', () => new TerraPioneer()), compatibility: 'conglomerates'},
    'Terraformer53': {Factory: conglomeratesVariant('Terraformer53', 'Have a terraform rating of 53 (or 39 with Turmoil) between you and your teammate', () => new Terraformer()), compatibility: 'conglomerates'},
    'Terran9': {Factory: conglomeratesVariant('Terran9', 'Have 9 Earth tags in play between you and your teammate', () => new Terran()), compatibility: 'conglomerates'},
    'Tradesman5': {Factory: conglomeratesVariant('Tradesman5', 'Have 5 different types of non-standard resources between you and your teammate', () => new Tradesman()), compatibility: 'conglomerates'},
    'Tropicalist5': {Factory: conglomeratesVariant('Tropicalist5', 'Own 5 tiles in the middle 3 equatorial rows between you and your teammate', () => new Tropicalist()), compatibility: 'conglomerates'},
    'Tycoon23': {Factory: conglomeratesVariant('Tycoon23', 'Have 23 project cards in play (not events) between you and your teammate', () => new Tycoon()), compatibility: 'conglomerates'},
    'V. Electrician6': {Factory: conglomeratesVariant('V. Electrician6', 'Have 6 power tags in play between you and your teammate', () => new VElectrician()), compatibility: 'conglomerates'},
    'V. Spacefarer6': {Factory: conglomeratesVariant('V. Spacefarer6', 'Have 6 space tags in play between you and your teammate', () => new VSpacefarer()), compatibility: 'conglomerates'},

    // Conglomerates: the same treatment extended to expansion milestones that were missing it.
    'Hoverlord11': {Factory: conglomeratesVariant('Hoverlord11', 'Have 11 floater resources on your cards between you and your teammate', () => new Hoverlord()), compatibility: 'conglomerates'},
    'Hydrologist6': {Factory: conglomeratesVariant('Hydrologist6', 'Have placed 6 oceans between you and your teammate', () => new Hydrologist()), compatibility: 'conglomerates'},
    'Landshaper5': {Factory: conglomeratesVariant('Landshaper5', 'Between you and your teammate, score at least 5 (1 point each for a city tile, a greenery, and a special tile; max 3 per player)', () => new Landshaper()), compatibility: 'conglomerates'},
    'Lobbyist11': {Factory: conglomeratesVariant('Lobbyist11', 'Between you and your teammate, have a combined 11 delegates in parties (Party Leaders and Chairman also count; max 7 per player)', () => new Lobbyist()), compatibility: 'conglomerates'},
    'Lunarchitect9': {Factory: conglomeratesVariant('Lunarchitect9', 'Own 9 Moon tiles between you and your teammate', () => new Lunarchitect()), compatibility: 'conglomerates'},
    'Metallurgist9': {Factory: conglomeratesVariant('Metallurgist9', 'Have a total of 9 steel and titanium production between you and your teammate', () => new Metallurgist()), compatibility: 'conglomerates'},
    'Networker5': {Factory: conglomeratesVariant('Networker5', 'Have placed 5 tiles adjacent to tiles that grant adjacency bonuses between you and your teammate', () => new Networker()), compatibility: 'conglomerates'},
    'One Giant Step9': {Factory: conglomeratesVariant('One Giant Step9', 'Have 9 moon tags between you and your teammate', () => new OneGiantStep()), compatibility: 'conglomerates'},
    'Philantropist8': {Factory: conglomeratesVariant('Philantropist8', 'Have 8 cards with non-negative VP between you and your teammate', () => new Philantropist()), compatibility: 'conglomerates'},
    'Producer24': {Factory: conglomeratesVariant('Producer24', 'Have a combined total production of at least 24 between you and your teammate', () => new Producer()), compatibility: 'conglomerates'},
    'Purifier5': {Factory: conglomeratesVariant('Purifier5', 'Have removed at least 5 hazard tiles (excluding WGT) between you and your teammate', () => new Purifier()), compatibility: 'conglomerates'},
    'Risktaker5': {Factory: conglomeratesVariant('Risktaker5', 'Have at least 5 NEGATIVE VPs among your cards between you and your teammate (Event cards count.)', () => new Risktaker()), compatibility: 'conglomerates'},
    'Sponsor5': {Factory: conglomeratesVariant('Sponsor5', 'Have 5 cards that have cost of 20 M€ or more between you and your teammate', () => new Sponsor()), compatibility: 'conglomerates'},
    'Thawer8': {Factory: conglomeratesVariant('Thawer8', 'Have raised the temperature 8 steps between you and your teammate', () => new Thawer()), compatibility: 'conglomerates'},
    'Trader5': {Factory: conglomeratesVariant('Trader5', 'Have 5 different types of resources on cards between you and your teammate', () => new Trader()), compatibility: 'conglomerates'},
    'Tunneler11': {Factory: conglomeratesVariant('Tunneler11', 'Have at least 11 underground tokens between you and your teammate', () => new Tunneler()), compatibility: 'conglomerates'},
  },
  boards: {
    [BoardName.THARSIS]: ['Terraformer', 'Mayor', 'Gardener', 'Builder', 'Planner'],
    [BoardName.HELLAS]: ['Diversifier', 'Tactician', 'Polar Explorer', 'Energizer', 'Rim Settler'],
    [BoardName.ELYSIUM]: ['Generalist', 'Specialist', 'Ecologist', 'Tycoon', 'Legend'],
    [BoardName.AMAZONIS]: ['Colonizer', 'Forester', 'Minimalist', 'Terran', 'Tropicalist'],
    [BoardName.ARABIA_TERRA]: ['Economizer', 'Pioneer', 'Land Specialist', 'Martian', 'Terran'],
    [BoardName.TERRA_CIMMERIA]: ['T. Collector', 'Firestarter', 'Terra Pioneer', 'Spacefarer', 'Gambler'],
    [BoardName.VASTITAS_BOREALIS]: ['V. Electrician', 'Smith', 'Tradesman', 'Irrigator', 'Capitalist'],
    [BoardName.UTOPIA_PLANITIA]: ['Land Specialist', 'Pioneer', 'Tradesman', 'Smith', 'Researcher'],
    [BoardName.VASTITAS_BOREALIS_NOVA]: ['Agronomist', 'V. Spacefarer', 'Geologist', 'Engineer', 'Farmer'],
    [BoardName.TERRA_CIMMERIA_NOVA]: ['Planetologist', 'Architect', 'Coastguard', 'C. Forester', 'Fundraiser'],
    [BoardName.HOLLANDIA]: [],
    [BoardName.CUSTOM]: [],
  },
  expansions: {
    venus: ['Hoverlord'],
    ares: ['Networker', 'Purifier'],
    moon: ['One Giant Step', 'Lunarchitect'],
    underworld: ['Risktaker', 'Tunneler'],
  },
  create: (name: string): IMilestone | undefined => {
    try {
      return milestoneManifest.createOrThrow(name);
    } catch (e) {
      return undefined;
    }
  },
  createOrThrow(name: string): IMilestone {
    try {
      return new milestoneManifest.all[name as MilestoneName].Factory();
    } catch (e) {
      throw new Error(`Milestone ${name} not found.`);
    }
  },
} as const;
