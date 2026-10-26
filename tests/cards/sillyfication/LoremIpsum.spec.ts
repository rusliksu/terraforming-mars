import {expect} from 'chai';
import {LoremIpsum} from '../../../src/server/cards/sillyfication/LoremIpsum';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('LoremIpsum', () => {
  it('draws a card', () => {
    const card = new LoremIpsum();
    const [game, player] = testGame(2);
    player.cardsInHand = [];

    card.play(player);
    runAllActions(game);

    expect(player.cardsInHand).to.have.length(1);
  });
});
