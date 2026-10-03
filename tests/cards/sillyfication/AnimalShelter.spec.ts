import {expect} from 'chai';
import {AnimalShelter} from '../../../src/server/cards/sillyfication/AnimalShelter';
import {Birds} from '../../../src/server/cards/base/Birds';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('AnimalShelter', () => {
  let card: AnimalShelter;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new AnimalShelter();
    [/* game */, player, player2] = testGame(2);
    player.playedCards.push(card);
  });

  it('requires 4 cities on Mars, from any player', () => {
    const game = player.game;
    expect(card.canPlay(player)).is.false;

    for (let i = 0; i < 3; i++) {
      game.addCity(player2, game.board.getAvailableSpacesForCity(player2)[0]);
    }
    expect(card.canPlay(player)).is.false;

    game.addCity(player, game.board.getAvailableSpacesForCity(player)[0]);
    expect(card.canPlay(player)).is.true;
  });

  it('adds 1 animal to a card of yours for every 2 cities on Mars', () => {
    const birds = new Birds();
    player.playedCards.push(birds);

    const game = player.game;
    for (let i = 0; i < 5; i++) {
      game.addCity(player, game.board.getAvailableSpacesForCity(player)[0]);
    }

    card.bespokePlay(player);
    runAllActions(game);

    expect(birds.resourceCount).to.eq(2);
  });
});
