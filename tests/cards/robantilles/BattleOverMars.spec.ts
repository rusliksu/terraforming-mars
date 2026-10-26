import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {BattleOverMars} from '../../../src/server/cards/robantilles/BattleOverMars';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {RandomMAOptionType} from '../../../src/common/ma/RandomMAOptionType';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('BattleOverMars', () => {
  let card: BattleOverMars;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new BattleOverMars();
    [game, player] = testGame(2);
  });

  it('can play when an unclaimed milestone or award exists', () => {
    expect(card.canPlay(player)).is.true;
  });

  it('cannot play when everything is claimed or funded', () => {
    for (const milestone of game.milestones) {
      game.claimedMilestones.push({player, milestone});
    }
    for (const award of game.awards) {
      game.fundedAwards.push({player, award});
    }
    expect(card.canPlay(player)).is.false;
  });

  it('removes an unclaimed milestone from the game (first option is the first unclaimed milestone)', () => {
    const target = game.milestones[0];
    const before = game.milestones.length;

    const orOptions = cast(card.play(player), OrOptions);
    orOptions.options[0].cb(undefined);

    expect(game.milestones).to.have.length(before - 1);
    expect(game.milestones).to.not.include(target);
  });

  it('removes an unclaimed award from the game (option after all milestones is the first unclaimed award)', () => {
    const milestoneCount = game.milestones.length;
    const target = game.awards[0];
    const before = game.awards.length;

    const orOptions = cast(card.play(player), OrOptions);
    orOptions.options[milestoneCount].cb(undefined);

    expect(game.awards).to.have.length(before - 1);
    expect(game.awards).to.not.include(target);
  });

  it('does not offer a replacement when awards/milestones are not randomized', () => {
    [game, player] = testGame(2, {randomMA: RandomMAOptionType.NONE});

    const orOptions = cast(card.play(player), OrOptions);
    const result = orOptions.options[0].cb(undefined);

    expect(result).is.undefined;
  });

  it('offers a replacement milestone when awards/milestones are randomized', () => {
    [game, player] = testGame(2, {randomMA: RandomMAOptionType.LIMITED});
    const before = game.milestones.length - 1; // one is about to be removed

    const orOptions = cast(card.play(player), OrOptions);
    const replacementOptions = cast(orOptions.options[0].cb(undefined), OrOptions);

    expect(replacementOptions.options.length).is.greaterThan(0);

    replacementOptions.options[0].cb(undefined);
    expect(game.milestones).to.have.length(before + 1);
  });
});
