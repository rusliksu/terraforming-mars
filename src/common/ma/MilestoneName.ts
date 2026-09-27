export const milestoneNames = [
  // Tharsis
  'Terraformer',
  'Mayor',
  'Gardener',
  'Planner',
  'Builder',

  // Elysium
  'Generalist',
  'Specialist',
  'Ecologist',
  'Tycoon',
  'Legend',

  // Hellas
  'Diversifier',
  'Tactician',
  'Polar Explorer',
  'Energizer',
  'Rim Settler',

  // Venus
  'Hoverlord',

  // Ares
  'Networker',

  // The Moon
  'One Giant Step',
  'Lunarchitect',

  // Amazonis Planitia
  'Colonizer',
  'Minimalist',
  'Terran',
  'Tropicalist',

  // Arabia Terra
  'Economizer',
  'Pioneer',
  'Land Specialist',
  'Martian',

  // Terra Cimmeria
  'T. Collector',
  'Firestarter',
  'Terra Pioneer',
  'Spacefarer', // TODO(kberg): Rename to T. Spacefarer
  'Gambler',

  // Terra Cimmeria Nova
  'Architect',
  'Coastguard', // Also Modular
  'C. Forester',

  // Vastitas Borealis
  'V. Electrician',
  'Smith',
  'Tradesman',
  'Irrigator',
  'Capitalist',

  // Vastitas Borealis Nova
  'Agronomist',
  'Engineer',
  'V. Spacefarer',
  'Geologist',
  'Farmer', // And modular

  // Underworld
  'Tunneler',
  'Risktaker',

  // Ares Extreme
  'Purifier',

  // Modular
  'Briber',
  'Builder7',
  'Forester',
  'Fundraiser',
  'Hydrologist',
  'Landshaper',
  'Legend4',
  'Lobbyist',
  'Merchant',
  'Metallurgist', // Same as Smith
  'Philantropist',
  'Pioneer4',
  'Planetologist',
  'Producer',
  'Researcher',
  'Spacefarer4',
  'Sponsor',
  'Tactician4',
  'Terraformer29',
  'Terran5',
  'Thawer',
  'Trader',
  'Tycoon10',

  // Conglomerates: scaled (1.5x, rounded up) siblings of the board milestones above, swapped
  // in for their board slot only when the Conglomerates expansion is on, so the displayed
  // number matches the real (team-combined) requirement. See CONGLOMERATES_MILESTONE_MAP.
  'Agronomist6',
  'Architect5',
  'Builder12',
  'C. Forester5',
  'Capitalist96',
  'Coastguard5',
  'Colonizer6',
  'Diversifier10',
  'Ecologist6',
  'Economizer8',
  'Energizer9',
  'Engineer15',
  'Farmer8',
  'Firestarter30',
  'Forester6',
  'Fundraiser18',
  'Gambler3',
  'Gardener5',
  'Generalist2',
  'Geologist5',
  'Irrigator6',
  'Land Specialist5',
  'Legend8',
  'Martian6',
  'Mayor5',
  'Pioneer5',
  'Planner24',
  'Polar Explorer5',
  'Researcher6',
  'Rim Settler5',
  'Smith9',
  'Spacefarer9',
  'Specialist15',
  'T. Collector5',
  'Tactician8',
  'Terra Pioneer8',
  'Terraformer53',
  'Terran9',
  'Tradesman5',
  'Tropicalist5',
  'Tycoon23',
  'V. Electrician6',
  'V. Spacefarer6',

  // Conglomerates: the same treatment extended to expansion milestones (Venus, Turmoil,
  // Moon, Ares, Underworld, and a few base-adjacent ones) that were missing it.
  'Hoverlord11',
  'Hydrologist6',
  'Landshaper5',
  'Lobbyist11',
  'Lunarchitect9',
  'Metallurgist9',
  'Networker5',
  'One Giant Step9',
  'Philantropist8',
  'Producer24',
  'Purifier5',
  'Risktaker5',
  'Sponsor5',
  'Thawer8',
  'Trader5',
  'Tunneler11',
] as const;

export type MilestoneName = typeof milestoneNames[number];

const MILESTONE_RENAMES = new Map<string, MilestoneName>([
  // When renaming an award add the old name here (like the example below), and add a TODO (like the example below)
  // And remember to add a test in spec.ts.

  // TODO(yournamehere): remove after 2021-04-05
  // ['Electrician', 'V. Electrician'],
]);

export function maybeRenamedMilestone(name: string): MilestoneName {
  const renamed = MILESTONE_RENAMES.get(name);
  return renamed ?? (name as MilestoneName);
}
