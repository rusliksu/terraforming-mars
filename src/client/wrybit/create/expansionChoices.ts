import {EXPANSIONS, MODULE_NAMES} from '@/common/cards/GameModule';
import type {Expansion} from '@/common/cards/GameModule';

const ICONS: Record<Expansion, string> = {
  corpera: 'expansion-icon-CE',
  rebalanced: 'expansion-icon-rebalanced',
  prelude: 'expansion-icon-prelude',
  prelude2: 'expansion-icon-prelude2',
  venus: 'expansion-icon-venus',
  venusPhase2: 'expansion-icon-venusPhase2',
  colonies: 'expansion-icon-colony',
  turmoil: 'expansion-icon-turmoil',
  moreParties: 'expansion-icon-moreParties',
  promo: 'expansion-icon-promo',
  ares: 'expansion-icon-ares',
  community: 'expansion-icon-community',
  moon: 'expansion-icon-themoon',
  pathfinders: 'expansion-icon-pathfinders',
  betterMars: '',
  ceo: 'expansion-icon-ceo',
  starwars: 'expansion-icon-starwars',
  underworld: 'expansion-icon-underworld',
  deltaProject: 'expansion-icon-deltaProject',
  sillyfication: 'expansion-icon-sillyfication',
  customCards: 'expansion-icon-customCards',
  conglomerates: 'expansion-icon-conglomerates',
  corporateBetterments: 'expansion-icon-corporateBetterments',
  idesOfMars: 'expansion-icon-idesOfMars',
  robAntilles: 'expansion-icon-robAntilles',
  industries: 'expansion-icon-industries',
  highOrbit: 'expansion-icon-highOrbit',
  solaris: 'expansion-icon-solaris',
};

const OFFICIAL: ReadonlyArray<Expansion> = ['corpera', 'prelude', 'prelude2', 'venus', 'colonies', 'turmoil', 'promo'];
export const expansionChoices = EXPANSIONS.map((expansion) => ({expansion, label: MODULE_NAMES[expansion], iconClass: ICONS[expansion], official: OFFICIAL.includes(expansion)}));
