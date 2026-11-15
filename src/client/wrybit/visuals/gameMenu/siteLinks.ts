import {paths} from '@/common/app/paths';
import type {GlyphName} from '@/client/wrybit/visuals/common/mobileGlyphs';

type SiteLink = {label: string, icon: GlyphName, href: string, inMenu: boolean};
export const START_PAGE_LINK: SiteLink = {label: 'Start page', icon: 'mars', href: './', inMenu: true};
export const SITE_LINKS: ReadonlyArray<SiteLink> = [
  {label: 'New game', icon: 'newGame', href: paths.NEW_GAME, inMenu: true},
  {label: 'Statistics', icon: 'statistics', href: paths.STATS, inMenu: true},
  {label: 'Games', icon: 'statistics', href: paths.GAMES_OVERVIEW, inMenu: true},
  {label: 'Cards list', icon: 'cardsList', href: paths.CARDS, inMenu: true},
  {label: 'Game rules', icon: 'rules', href: paths.HELP, inMenu: true},
  {label: 'Card Library', icon: 'cardsList', href: paths.CARD_LIBRARY, inMenu: true},
  {label: 'Map Library', icon: 'boardGame', href: paths.MAP_LIBRARY, inMenu: true},
];
