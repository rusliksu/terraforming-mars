import type {CardName} from '@/common/cards/CardName';
import type {Color} from '@/common/Color';

// UI edits only. The native input still validates and builds its own response.
export type InputChoice = {type: 'card', name: CardName} | {type: 'player', color: Color};
export type InputChoiceEditor = {
  selectChoice(choice: InputChoice): boolean;
  getChoice(): InputChoice | undefined;
};
