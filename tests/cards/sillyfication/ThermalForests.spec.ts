import {expect} from 'chai';
import {ThermalForests} from '../../../src/server/cards/sillyfication/ThermalForests';
import {IGame} from '../../../src/server/IGame';
import {Space} from '../../../src/server/boards/Space';
import {Board} from '../../../src/server/boards/Board';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('ThermalForests', () => {
  let card: ThermalForests;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new ThermalForests();
    [game, player] = testGame(2);
    player.megaCredits = 20;
  });

  function addAdjacentGreeneries(): void {
    const first = game.board.getAvailableSpacesOnLand(player)[0];
    game.addGreenery(player, first);
    const neighbour = game.board.getAdjacentSpaces(first)
      .find((s: Space) => game.board.getAvailableSpacesOnLand(player).includes(s));
    if (neighbour === undefined) {
      throw new Error('no adjacent land space for test setup');
    }
    game.addGreenery(player, neighbour);
  }

  it('cannot play with no greeneries', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('cannot play with a single greenery', () => {
    game.addGreenery(player, game.board.getAvailableSpacesOnLand(player)[0]);
    expect(card.canPlay(player)).is.false;
  });

  it('cannot play with two greeneries that are not adjacent', () => {
    const spaces = game.board.getAvailableSpacesOnLand(player);
    const first = spaces[0];
    const nonNeighbour = spaces.find((s) =>
      s !== first && !game.board.getAdjacentSpaces(first).includes(s));
    if (nonNeighbour === undefined) {
      throw new Error('no non-adjacent land space for test setup');
    }
    game.addGreenery(player, first);
    game.addGreenery(player, nonNeighbour);

    // The greeneries:2 requirement is met, but the adjacency check is not.
    expect(card.canPlay(player)).is.false;
  });

  it('can play with two adjacent greeneries', () => {
    addAdjacentGreeneries();

    const greeneries = game.board.spaces.filter((s) => Board.isGreenerySpace(s));
    expect(greeneries).to.have.length(2);
    expect(card.canPlay(player)).is.true;
  });

  it('play raises production and grants heat', () => {
    addAdjacentGreeneries();

    card.play(player);

    expect(player.production.heat).to.eq(2);
    expect(player.production.plants).to.eq(1);
    expect(player.heat).to.eq(3);
  });
});
