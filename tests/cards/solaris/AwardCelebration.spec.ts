import {expect} from 'chai';
import {AwardCelebration} from '../../../src/server/cards/solaris/AwardCelebration';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast} from '../../../src/common/utils/utils';

describe('AwardCelebration', () => {
  let card: AwardCelebration;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;

  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.CENTRISTS);
    card = new AwardCelebration();
    [game, player, player2] = testGame(2, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without Centrists ruling or 2 delegates', () => {
    expect(card.canPlay(player)).is.false;
    setRulingParty(game, PartyName.CENTRISTS);
    expect(card.canPlay(player)).is.true;
  });

  it('cannot play when there is no unclaimed milestone', () => {
    setRulingParty(game, PartyName.CENTRISTS);
    for (const milestone of game.milestones) {
      game.claimedMilestones.push({player: player2, milestone});
    }
    expect(card.canPlay(player)).is.false;
  });

  it('gives the player 2 TR and each qualifying opponent 1 TR', () => {
    setRulingParty(game, PartyName.CENTRISTS);
    player.setTerraformRating(26); // With turmoilExtension, Terraformer requires 26.
    player2.setTerraformRating(26);

    const trBefore = player.terraformRating;
    const opponentTrBefore = player2.terraformRating;

    const orOptions = cast(card.play(player), OrOptions);
    const terraformerOption = orOptions.options.find((option) => option.title === 'Terraformer')!;
    terraformerOption.cb(undefined);

    expect(player.terraformRating).to.eq(trBefore + 2);
    expect(player2.terraformRating).to.eq(opponentTrBefore + 1);
  });

  it('gives the player nothing if they do not meet the milestone requirement', () => {
    setRulingParty(game, PartyName.CENTRISTS);
    player2.setTerraformRating(26);

    const trBefore = player.terraformRating;
    const opponentTrBefore = player2.terraformRating;

    const orOptions = cast(card.play(player), OrOptions);
    const terraformerOption = orOptions.options.find((option) => option.title === 'Terraformer')!;
    terraformerOption.cb(undefined);

    expect(player.terraformRating).to.eq(trBefore);
    expect(player2.terraformRating).to.eq(opponentTrBefore + 1);
  });
});
