import type {OrOptionsModel, PlayerInputModel} from '@/common/models/PlayerInputModel';
import type {GameModel} from '@/common/models/GameModel';
import type {ClaimedMilestoneModel} from '@/common/models/ClaimedMilestoneModel';
import type {FundedAwardModel} from '@/common/models/FundedAwardModel';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {titleKey} from './orOptionsShortLabels';

export type MilestoneAwardChoice = {index: number, name: string, milestone?: ClaimedMilestoneModel, award?: FundedAwardModel};
export type MilestoneAwardChoices = {kind: 'milestones' | 'awards', choices: ReadonlyArray<MilestoneAwardChoice>};

function optionName(option: PlayerInputModel): string | undefined {
  if (option.type !== 'option') {
    return undefined;
  }
  const title = option.title;
  if (typeof title === 'string') {
    return title;
  }
  const name = title.data[0];
  return title.message === 'Fund ${0} award' && name?.type === LogMessageDataType.AWARD ? String(name.value) : undefined;
}

/** Match the native Player/Vitor prompt shape against this game's public models. */
export function milestoneAwardChoices(input: OrOptionsModel, game: GameModel): MilestoneAwardChoices | undefined {
  const title = titleKey(input.title);
  const kind = title === 'Claim a milestone' ? 'milestones' :
    title === 'Fund an award (${0} M€)' || title === 'Select award to fund' ? 'awards' : undefined;
  if (kind === undefined || input.options.length === 0) {
    return undefined;
  }
  const choices: MilestoneAwardChoice[] = [];
  for (const [index, option] of input.options.entries()) {
    const name = optionName(option);
    if (name === undefined) {
      return undefined;
    }
    const milestone = kind === 'milestones' ? game.milestones.find((item) => item.name === name) : undefined;
    const award = kind === 'awards' ? game.awards.find((item) => item.name === name) : undefined;
    if (milestone === undefined && award === undefined) {
      return undefined;
    }
    choices.push({index, name, milestone, award});
  }
  return {kind, choices};
}
