import {translateText, translateTextWithParams} from '@/client/directives/i18n';

export type GameSetupChip = {
  key: string;
  label: string;
  seatIcon?: 'human' | 'ai' | 'none';
  iconClass?: string;
  capitalized?: boolean;
  statsHref?: string;
};

export function seatChips(humanCount: number, aiCount: number): Array<GameSetupChip> {
  if (humanCount + aiCount === 1) {
    return [{key: 'humans', label: translateText('Solo'), seatIcon: 'human'}];
  }
  const chips: Array<GameSetupChip> = [];
  if (humanCount > 0) {
    const label = humanCount === 1 ? translateText('1 player') : translateTextWithParams('${0} players', [String(humanCount)]);
    chips.push({key: 'humans', label, seatIcon: 'human'});
  }
  if (aiCount > 0) {
    chips.push({key: 'ai', label: translateTextWithParams('${0} AI', [String(aiCount)]), seatIcon: 'ai'});
  }
  return chips;
}

export function boardChip(boardName: string, options: {label?: string, statsHref?: string} = {}): GameSetupChip {
  return {key: 'board', label: options.label ?? translateText(boardName), capitalized: true, statsHref: options.statsHref};
}

export function expansionChips(_isActive: (expansion: never) => boolean): Array<GameSetupChip> {
  return [{key: 'base', label: translateText('Base game'), iconClass: 'expansion-icon-base'}];
}

export function optionChips(_options: unknown, _isActive: (expansion: never) => boolean, _playerCount: number): Array<GameSetupChip> {
  return [];
}
