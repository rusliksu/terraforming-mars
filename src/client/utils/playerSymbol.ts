import {getPreferences} from '@/client/utils/PreferencesManager';
import {Color} from '@/common/Color';

export const SYMBOL_FOR_COLOR = {
  red: '▲',
  blue: '+',
  black: '∇',
  yellow: '∗',
  green: '◆',
  purple: '◉',
  orange: '▢',
  pink: '◈',
  gold: '✦',
  emerald: '⬢',
  ginger: '♨',
  hydro: '♂',
  pearl: '✧',
  antistress: '✚',
  gambit: '♞',
  turquoise: '◇',
  vanger: '✳',
  serge: 'S',
  saturn: '♄',
  saturnrings: '◎',
  titan: 'T',
  saturnstorm: '∿',
  catseye: '◉',
  bronze: '▦',
  neutral: '★',
} satisfies Record<Color, string>;

export function playerSymbol(color: Color, optionalSuffix: string = '') {
  if (getPreferences().symbol_overlay) {
    return SYMBOL_FOR_COLOR[color] + optionalSuffix;
  }
  return '';
}
