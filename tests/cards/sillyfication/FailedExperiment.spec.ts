import {expect} from 'chai';
import {FailedExperiment} from '../../../src/server/cards/sillyfication/FailedExperiment';
import {MicroCredits} from '../../../src/server/cards/sillyfication/MicroCredits';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast} from '../../../src/common/utils/utils';

describe('FailedExperiment', () => {
  let card: FailedExperiment;
  let player: TestPlayer;

  beforeEach(() => {
    card = new FailedExperiment();
    [/* game */, player] = testGame(2);
  });

  it('cannot play with an empty hand', () => {
    player.cardsInHand = [];
    expect(card.canPlay(player)).is.false;
  });

  it('scores -1 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(-1);
  });

  it('discards a card, then draws 2', () => {
    const toDiscard = new MicroCredits();
    player.cardsInHand = [toDiscard];

    card.play(player);
    runAllActions(player.game);
    cast(player.popWaitingFor(), SelectCard).cb([toDiscard]);
    runAllActions(player.game);

    // Discarded the 1 held card, drew 2.
    expect(player.cardsInHand).to.have.length(2);
  });
});
