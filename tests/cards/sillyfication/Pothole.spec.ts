import {expect} from 'chai';
import {Pothole} from '../../../src/server/cards/sillyfication/Pothole';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('Pothole', () => {
  let card: Pothole;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Pothole();
    [game, player, player2] = testGame(2);
  });

  it('cannot play when no player has a city', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('decreases a city owner\'s M€ production 1 step', () => {
    const citySpace = game.board.getAvailableSpacesForCity(player2)[0];
    game.addCity(player2, citySpace);
    player2.production.override({megacredits: 3});

    expect(card.canPlay(player)).is.true;

    card.play(player);
    runAllActions(game);

    expect(player2.production.megacredits).to.eq(2);
  });
});
