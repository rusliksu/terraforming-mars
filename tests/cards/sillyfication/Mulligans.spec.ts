import {expect} from 'chai';
import {Mulligans} from '../../../src/server/cards/sillyfication/Mulligans';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast} from '../../../src/common/utils/utils';

describe('Mulligans', () => {
  let card: Mulligans;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new Mulligans();
    [/* game */, player, player2] = testGame(2);
  });

  it('draws a card for the player who played it', () => {
    const game = player.game;
    const before = player.cardsInHand.length;

    card.bespokePlay(player);
    runAllActions(game);

    expect(player.cardsInHand.length).is.greaterThan(before);
  });

  it('lets each player discard up to their science tag count and draw that many back', () => {
    const game = player.game;
    player.tagsForTest = {science: 0};
    player2.tagsForTest = {science: 2};
    player.cardsInHand = game.projectDeck.drawN(game, 3);
    player2.cardsInHand = game.projectDeck.drawN(game, 3);
    const player2HandSize = player2.cardsInHand.length;

    card.bespokePlay(player);
    runAllActions(game);

    // Players are processed in order: player has 0 science tags, so their own prompt allows no discards.
    let selectCard = cast(player.popWaitingFor(), SelectCard);
    expect(selectCard.config.max).to.eq(0);
    selectCard.cb([]);
    runAllActions(game);

    selectCard = cast(player2.popWaitingFor(), SelectCard);
    expect(selectCard.config.max).to.eq(2);
    selectCard.cb(selectCard.cards.slice(0, 2));
    runAllActions(game);

    expect(player2.cardsInHand.length).to.eq(player2HandSize);
  });
});
