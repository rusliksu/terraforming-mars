import {expect} from 'chai';
import {DataLibrary} from '../../../src/server/cards/robantilles/DataLibrary';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('DataLibrary', () => {
  let card: DataLibrary;
  let player: TestPlayer;

  beforeEach(() => {
    card = new DataLibrary();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('action adds 1 data to this card', () => {
    card.action(player);
    runAllActions(player.game);
    expect(card.resourceCount).to.eq(1);
  });

  it('automatically removes 2 data and draws a card once the threshold is reached', () => {
    const cardsInHandBefore = player.cardsInHand.length;
    card.action(player);
    runAllActions(player.game);
    expect(card.resourceCount).to.eq(1);
    expect(player.cardsInHand.length).to.eq(cardsInHandBefore);

    card.action(player);
    runAllActions(player.game);
    expect(card.resourceCount).to.eq(0);
    expect(player.cardsInHand.length).to.eq(cardsInHandBefore + 1);
  });
});
