import {expect} from 'chai';
import {UnderwaterOutpost} from '../../../src/server/cards/corporatebetterments/UnderwaterOutpost';
import {IProjectCard} from '../../../src/server/cards/IProjectCard';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {addOcean, runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {cast} from '../../../src/common/utils/utils';

describe('UnderwaterOutpost', () => {
  let card: UnderwaterOutpost;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new UnderwaterOutpost();
    [game, player] = testGame(2);
  });

  it('requires 2 oceans in play', () => {
    expect(card.canPlay(player)).is.false;
    addOcean(player);
    expect(card.canPlay(player)).is.false;
    addOcean(player);
    expect(card.canPlay(player)).is.true;
  });

  it('draws 2 cards and discards 1', () => {
    player.playedCards.push(card);
    card.action(player);
    runAllActions(game);

    const action = cast(player.popWaitingFor(), SelectCard<IProjectCard>);
    action.cb([action.cards[0]]);

    expect(player.cardsInHand).has.lengthOf(1);
    expect(player.cardsInHand[0]).to.eq(action.cards[0]);
    expect(game.projectDeck.discardPile.indexOf(action.cards[1])).not.to.eq(-1);
  });

  it('scores 2 VP', () => {
    expect(card.getVictoryPoints(player)).eq(2);
  });
});
