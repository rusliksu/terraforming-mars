import {expect} from 'chai';
import {CommitteeToFormACommittee} from '../../../src/server/cards/sillyfication/CommitteeToFormACommittee';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('CommitteeToFormACommittee', () => {
  it('action gains 1 M€', () => {
    const card = new CommitteeToFormACommittee();
    const [game, player] = testGame(2);
    player.playedCards.push(card);
    player.megaCredits = 0;

    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);

    expect(player.megaCredits).to.eq(1);
  });
});
