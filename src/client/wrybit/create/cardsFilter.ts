import type {CardName} from '@/common/cards/CardName';
import type {InputHosts} from '@/client/wrybit/shell/inputHosts';

export type CardsFilterBinding = {
  title: string;
  inputHost: InputHosts;
  selected: ReadonlyArray<CardName>;
  searchMatches: ReadonlyArray<CardName>;
  activeCard: CardName | undefined;
  highlight(name: CardName): void;
  add(name: CardName): void;
  remove(name: CardName): void;
};
