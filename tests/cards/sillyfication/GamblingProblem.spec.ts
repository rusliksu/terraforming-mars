import {expect} from 'chai';
import {GamblingProblem} from '../../../src/server/cards/sillyfication/GamblingProblem';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('GamblingProblem', () => {
  let card: GamblingProblem;
  let player: TestPlayer;

  beforeEach(() => {
    card = new GamblingProblem();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('starts with no tags', () => {
    expect(card.tags).to.deep.eq([]);
  });

  it('gains the combined tags of the top 2 discarded cards', () => {
    const deck = player.game.projectDeck;
    const card1 = deck.drawPile[deck.drawPile.length - 1];
    const card2 = deck.drawPile[deck.drawPile.length - 2];
    const expectedTags = [...card1.tags, ...card2.tags];

    card.bespokePlay(player);

    expect(card.tags).to.deep.eq(expectedTags);
    expect(deck.discardPile).to.include(card1);
    expect(deck.discardPile).to.include(card2);
  });
});
