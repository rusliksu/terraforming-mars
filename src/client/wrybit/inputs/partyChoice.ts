import type {PlayerInputModel} from '@/common/models/PlayerInputModel';
import type {PartyCardDetails} from '@/client/components/turmoil/partyCardDetails';
import {titleKey} from './orOptionsShortLabels';

export type PartyChoice = {index: number, card: PartyCardDetails, stays: boolean};
const ALLIED_TITLE = /^\[(.+?)\] - Bonus: (.*?) - +Policy: (.*)$/;

/** The native prompt supplies allied descriptions; normal choices use our current agenda projection. */
export function partyChoices(options: ReadonlyArray<PlayerInputModel>, cards: ReadonlyArray<PartyCardDetails>): ReadonlyArray<PartyChoice> | undefined {
  if (options.length < 2 || cards.length === 0) {
    return undefined;
  }
  const choices: PartyChoice[] = [];
  let stayIndex: number | undefined;
  for (const [index, option] of options.entries()) {
    if (option.type !== 'option') {
      return undefined;
    }
    const title = titleKey(option.title);
    if (title === 'Do not move') {
      if (stayIndex !== undefined) {
        return undefined;
      }
      stayIndex = index;
      continue;
    }
    const allied = ALLIED_TITLE.exec(title);
    const card = cards.find((item) => item.party.name === (allied?.[1] ?? title));
    if (card === undefined || choices.some((choice) => choice.card.party.name === card.party.name)) {
      return undefined;
    }
    choices.push({index, card: allied === null ? card : {...card, bonusText: allied[2], policyText: allied[3]}, stays: false});
  }
  if (stayIndex !== undefined) {
    const missing = cards.filter((card) => !choices.some((choice) => choice.card.party.name === card.party.name));
    if (missing.length !== 1) {
      return undefined;
    }
    choices.push({index: stayIndex, card: missing[0], stays: true});
  }
  return choices.sort((first, second) => first.index - second.index);
}
