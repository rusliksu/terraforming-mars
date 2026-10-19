import {expect} from 'chai';
import {
  TRANSHUMANISTS_BONUS_1,
  TRANSHUMANISTS_BONUS_2,
  TRANSHUMANISTS_POLICY_1,
  TRANSHUMANISTS_POLICY_3,
  TRANSHUMANISTS_POLICY_4,
} from '../../../src/server/turmoil/parties/Transhumanists';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty, fakeCard, runAllActions} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Tag} from '../../../src/common/cards/Tag';
import {Terraformer} from '../../../src/server/milestones/Terraformer';
import {Banker} from '../../../src/server/awards/Banker';
import {SellPatentsStandardProject} from '../../../src/server/cards/base/standardProjects/SellPatentsStandardProject';
import {Loan} from '../../../src/server/cards/prelude/Loan';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast} from '../../../src/common/utils/utils';

describe('Transhumanists', () => {
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.TRANSHUMANISTS);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('bonus A: scores and grants 1 M€ per wild tag and per card with a tag requirement', () => {
    expect(TRANSHUMANISTS_BONUS_1.getScore(player)).to.eq(0);
    player.playedCards.push(fakeCard({tags: [Tag.WILD]}));
    expect(TRANSHUMANISTS_BONUS_1.getScore(player)).to.eq(1);
    player.playedCards.push(fakeCard({tags: [], requirements: [{tag: Tag.SCIENCE, count: 2}]}));
    expect(TRANSHUMANISTS_BONUS_1.getScore(player)).to.eq(2);

    const before = player.megaCredits;
    TRANSHUMANISTS_BONUS_1.grantForPlayer(player);
    expect(player.megaCredits).to.eq(before + 2);
  });

  it('bonus B: scores and grants 2 M€ per claimed milestone or funded award', () => {
    expect(TRANSHUMANISTS_BONUS_2.getScore(player)).to.eq(0);
    game.claimedMilestones.push({milestone: new Terraformer(), player});
    expect(TRANSHUMANISTS_BONUS_2.getScore(player)).to.eq(1);
    game.fundedAwards.push({award: new Banker(), player});
    expect(TRANSHUMANISTS_BONUS_2.getScore(player)).to.eq(2);

    const before = player.megaCredits;
    TRANSHUMANISTS_BONUS_2.grantForPlayer(player);
    expect(player.megaCredits).to.eq(before + 4);
  });

  it('policy 1: applies +1 extra wild tag while active', () => {
    expect(player.tags.extraWildTags).to.eq(0);
    TRANSHUMANISTS_POLICY_1.onPolicyStartForPlayer(player);
    expect(player.tags.extraWildTags).to.eq(1);
    TRANSHUMANISTS_POLICY_1.onPolicyEndForPlayer(player);
    expect(player.tags.extraWildTags).to.eq(0);
  });

  it('policy 2: gains 2 M€ when a standard project is played', () => {
    setRulingParty(game, PartyName.TRANSHUMANISTS, 'trap02');
    const before = player.megaCredits;

    const sellPatents = new SellPatentsStandardProject();
    const selectCard = sellPatents.action(player);
    selectCard.cb([]);

    expect(player.megaCredits).to.eq(before + 2);
  });

  it('policy 3: pays 15 M€ to draw and play a Prelude card', () => {
    player.megaCredits = 20;
    const loan = new Loan();
    game.preludeDeck.drawPile.push(loan);

    expect(TRANSHUMANISTS_POLICY_3.canAct(player)).is.true;
    TRANSHUMANISTS_POLICY_3.action(player);
    runAllActions(game);

    expect(player.megaCredits).to.eq(35); // 20 - 15 (action cost) + 30 (Loan's own effect)
    expect(player.playedCards.get(loan.name)).deep.eq(loan);
  });

  it('policy 3 cannot act without enough M€', () => {
    player.megaCredits = 0;
    expect(TRANSHUMANISTS_POLICY_3.canAct(player)).is.false;
  });

  it('policy 4: swaps in an unused milestone or award for 10 M€', () => {
    const [gameTwo, playerA] = testGame(2, {turmoilExtension: true, morePartiesExpansion: true});
    playerA.megaCredits = 20;

    expect(TRANSHUMANISTS_POLICY_4.canAct(playerA)).is.true;

    const milestonesBefore = [...gameTwo.milestones];
    const awardsBefore = [...gameTwo.awards];

    TRANSHUMANISTS_POLICY_4.action(playerA);
    runAllActions(gameTwo);

    // Walk down however many OrOptions steps this produces (offer -> which slot -> claim/skip),
    // always taking the first option -- deterministic regardless of which slot is offered.
    let waiting = playerA.getWaitingFor();
    let steps = 0;
    while (waiting !== undefined && steps < 5) {
      const orOptions = cast(waiting, OrOptions);
      orOptions.options[0].cb(undefined);
      runAllActions(gameTwo);
      waiting = playerA.getWaitingFor();
      steps++;
    }

    const milestonesChanged = gameTwo.milestones.some((m, i) => m !== milestonesBefore[i]);
    const awardsChanged = gameTwo.awards.some((a, i) => a !== awardsBefore[i]);
    expect(milestonesChanged || awardsChanged).is.true;
    expect(playerA.megaCredits).to.eq(10);
  });

  it('policy 4 cannot act without enough M€', () => {
    player.megaCredits = 0;
    expect(TRANSHUMANISTS_POLICY_4.canAct(player)).is.false;
  });
});
