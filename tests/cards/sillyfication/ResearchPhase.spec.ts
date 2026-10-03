import {expect} from 'chai';
import {ResearchPhase} from '../../../src/server/cards/sillyfication/ResearchPhase';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast} from '../../../src/common/utils/utils';

describe('ResearchPhase', () => {
  let card: ResearchPhase;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new ResearchPhase();
    [/* game */, player, player2] = testGame(2);
  });

  it('requires every player to have at least 6 M€', () => {
    player.megaCredits = 6;
    player2.megaCredits = 5;
    expect(card.canPlay(player)).is.false;

    player2.megaCredits = 6;
    expect(card.canPlay(player)).is.true;
  });

  it('deals every player cards to research and buy', () => {
    const game = player.game;
    player.cardsInHand = [];
    player2.cardsInHand = [];
    player.megaCredits = 100;
    player2.megaCredits = 100;

    card.bespokePlay(player);
    runAllActions(game);

    // Players are processed in order, one at a time.
    const selectCard = cast(player.popWaitingFor(), SelectCard);
    expect(selectCard.cards).to.have.length(4);
    selectCard.cb([]);
    runAllActions(game);

    const selectCard2 = cast(player2.popWaitingFor(), SelectCard);
    expect(selectCard2.cards).to.have.length(4);
    selectCard2.cb([]);
  });
});
