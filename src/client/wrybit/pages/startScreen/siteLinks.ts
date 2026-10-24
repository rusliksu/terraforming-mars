import {GlyphName} from '@/client/wrybit/visuals/common/mobileGlyphs';
import {PlanetStripeName} from './planetStripes';

// One list for the start page buttons and the navigation menu. Keep the order aligned with the
// planet stripes in assets/buttons-homepage/planet-stripes.jpg (one row per link).
export type SiteLink = {
  label: string,
  icon: GlyphName,
  planet: PlanetStripeName,
  href: string,
  external: boolean,
  inMenu: boolean,
};

export const SITE_LINKS: ReadonlyArray<SiteLink> = [
  {label: 'New game', icon: 'newGame', planet: 'venus', href: 'new-game', external: false, inMenu: true},
  {label: 'Game History & Elo', icon: 'statistics', planet: 'earth', href: '/elo/', external: false, inMenu: true},
  {label: 'Cards list', icon: 'cardsList', planet: 'mars', href: 'cards', external: true, inMenu: true},
  {label: 'Tier List', icon: 'updates', planet: 'jupiter', href: '/tierlist/', external: true, inMenu: true},
  {label: 'Map library', icon: 'boardGame', planet: 'saturn', href: 'map-library', external: false, inMenu: true},
  {label: 'Card maker', icon: 'newGame', planet: 'darkBlue', href: 'card-maker', external: false, inMenu: true},
  {label: 'How to Play', icon: 'rules', planet: 'neptune', href: 'https://github.com/rusliksu/terraforming-mars/wiki/Rulebooks', external: true, inMenu: true},
  {label: 'About us', icon: 'about', planet: 'moon', href: 'https://github.com/rusliksu/terraforming-mars#README', external: true, inMenu: true},
];

// Only in the navigation menu, above "New game": the way back to the start page.
export const START_PAGE_LINK: Pick<SiteLink, 'label' | 'icon' | 'href'> = {label: 'Start page', icon: 'mars', href: './'};
