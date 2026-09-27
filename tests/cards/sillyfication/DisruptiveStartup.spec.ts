import {expect} from 'chai';
import {DisruptiveStartup} from '../../../src/server/cards/sillyfication/DisruptiveStartup';
import {MicroCredits} from '../../../src/server/cards/sillyfication/MicroCredits';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast} from '../../../src/common/utils/utils';

describe('DisruptiveStartup', () => {
  let card: DisruptiveStartup;
  let player: TestPlayer;

  beforeEach(() => {
    card = new DisruptiveStartup();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('costs 14 and scores -1 VP', () => {
    expect(card.cost).to.eq(14);
    expect(card.getVictoryPoints(player)).to.eq(-1);
  });

  it('action sells a card from hand to gain 5 M€', () => {
    player.megaCredits = 0;
    const toDiscard = new MicroCredits();
    player.cardsInHand = [toDiscard];

    card.action(player);
    runAllActions(player.game);
    cast(player.popWaitingFor(), SelectCard).cb([toDiscard]);
    runAllActions(player.game);

    expect(player.megaCredits).to.eq(5);
    expect(player.cardsInHand).to.have.length(0);
  });
});
