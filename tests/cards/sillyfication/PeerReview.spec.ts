import {expect} from 'chai';
import {PeerReview} from '../../../src/server/cards/sillyfication/PeerReview';
import {testGame} from '../../TestGame';

describe('PeerReview', () => {
  it('gains 5 M€ and scores 1 VP without disturbing the deck', () => {
    const card = new PeerReview();
    const [game, player] = testGame(2);
    player.megaCredits = 0;

    const topBefore = game.projectDeck.drawPile.slice(-3).map((c) => c.name);

    card.play(player);

    expect(player.megaCredits).to.eq(5);
    expect(card.getVictoryPoints(player)).to.eq(1);
    expect(game.projectDeck.drawPile.slice(-3).map((c) => c.name)).to.deep.eq(topBefore);
  });
});
