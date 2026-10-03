import {GameModule} from '@/common/cards/GameModule';

export const WIKI = 'https://github.com/terraforming-mars/terraforming-mars/wiki';
const CUSTOM_DOCS = 'https://github.com/rusliksu/terraforming-mars/blob/main/docs/variants';

// Conglomerates isn't part of the upstream project, so its rules page lives on this fork's
// own wiki instead of the shared one above.
export const FORK_WIKI = 'https://github.com/JessyIsCute/terraforming-mars/wiki';

export const RULEBOOK_URLS: Record<GameModule, string> = {
  base: `${WIKI}/Rulebooks`,
  corpera: `${WIKI}/Rulebooks`,
  venus: `${WIKI}/Rulebooks`,
  prelude: `${WIKI}/Rulebooks`,
  colonies: `${WIKI}/Rulebooks`,
  turmoil: `${WIKI}/Rulebooks`,
  promo: `${WIKI}/Variants#promo-cards`,
  prelude2: `${WIKI}/Rulebooks`,
  ares: `${WIKI}/Ares`,
  community: `${WIKI}/Community`,
  moon: `${WIKI}/The-Moon`,
  pathfinders: `${WIKI}/Pathfinders`,
  ceo: `${WIKI}/CEOs`,
  starwars: `${WIKI}/StarWars`,
  underworld: `${WIKI}/Underworld`,
  deltaProject: `${WIKI}/Delta-Project`,
  sillyfication: `${FORK_WIKI}/Sillyfication`,
  betterMars: `${FORK_WIKI}/BetterMars`,
  customCards: `${WIKI}/Community`,
  conglomerates: `${FORK_WIKI}/Conglomerates`,
  corporateBetterments: `${FORK_WIKI}/Corporate-Betterments`,
  idesOfMars: `${FORK_WIKI}/Ides-of-Mars`,
  robAntilles: `${FORK_WIKI}/Rob-Antilles`,
  moreParties: `${FORK_WIKI}/More-Parties`,
  venusPhase2: `${FORK_WIKI}/Venus-Phase-2`,
  industries: `${FORK_WIKI}/Industries`,
  highOrbit: `${FORK_WIKI}/High-Orbit`,
  solaris: `${FORK_WIKI}/Solaris`,
};

export const WIKI_URLS = {
  changelog: `${WIKI}/Changelog`,
  aresExtreme: `${WIKI}/Ares-Extreme`,
  alternativeVenusBoard: `${WIKI}/Alternative-Venus-Board`,
  moonStandardProjectVariant: `${WIKI}/Variants#moon-standard-project-variant`,
  escapeVelocity: `${WIKI}/Escape-Velocity`,
  worldGovernmentTerraforming: `${WIKI}/Variants#world-government-terraforming`,
  trSoloMode: `${WIKI}/Variants#tr-solo-mode`,
  allowUndo: `${WIKI}/Variants#allow-undo`,
  undoOneStep: `${CUSTOM_DOCS}/undo.md#undo-one-step-experimental`,
  merger: `${WIKI}/Variants#Merger`,
  randomizeBoardTiles: `${WIKI}/Variants#randomize-board-tiles`,
  setPredefinedGame: `${WIKI}/Variants#set-predefined-game`,
  removeNegativeGlobalEvents: `${WIKI}/Variants#remove-negative-global-events`,
  initialDraft: `${WIKI}/Variants#initial-draft`,
  randomMilestonesAndAwards: `${WIKI}/Variants#random-milestones-and-awards`,
  venusTerraforming: `${WIKI}/Variants#venus-terraforming`,
  showRealtimeVP: `${WIKI}/Variants#show-real-time-vp`,
  fastMode: `${WIKI}/Variants#fast-mode`,
  beginnerCorporation: `${WIKI}/Variants#beginner-corporation`,
  trBoost: `${WIKI}/Variants#tr-boost`,
  customPreludes: `${WIKI}/FAQ#custom-prelude-lists`,
} as const;
