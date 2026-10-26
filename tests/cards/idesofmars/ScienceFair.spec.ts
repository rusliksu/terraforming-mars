import {expect} from 'chai';
import {ScienceFair} from '../../../src/server/cards/idesofmars/ScienceFair';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';

describe('ScienceFair', () => {
  let card: ScienceFair;
  let player: TestPlayer;
  let player2: TestPlayer;
  let player3: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new ScienceFair();
    [game, player, player2, player3] = testGame(3);
  });

  it('draws 2 cards for the player and 1 for every other player', () => {
    const before = game.projectDeck.drawPile.length;
    player.cardsInHand = [];
    player2.cardsInHand = [];
    player3.cardsInHand = [];

    card.bespokePlay(player);

    expect(player.cardsInHand).has.lengthOf(2);
    expect(player2.cardsInHand).has.lengthOf(1);
    expect(player3.cardsInHand).has.lengthOf(1);
    expect(game.projectDeck.drawPile).has.lengthOf(before - 4);
  });
});
