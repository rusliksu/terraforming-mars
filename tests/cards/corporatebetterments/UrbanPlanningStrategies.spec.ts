import {expect} from 'chai';
import {UrbanPlanningStrategies} from '../../../src/server/cards/corporatebetterments/UrbanPlanningStrategies';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {Space} from '../../../src/server/boards/Space';
import {testGame} from '../../TestGame';

describe('UrbanPlanningStrategies', () => {
  let card: UrbanPlanningStrategies;
  let game: IGame;
  let player: TestPlayer;
  let opponent: TestPlayer;

  beforeEach(() => {
    card = new UrbanPlanningStrategies();
    [game, player, opponent] = testGame(2);
  });

  /* Places a city for `owner` adjacent to an ocean tile and 2 greenery tiles, satisfying the card's condition. */
  function buildQualifyingCity(owner: TestPlayer): Space {
    const spaces = game.board.getAvailableSpacesOnLand(owner);
    for (const citySpace of spaces) {
      const neighbors = game.board.getAdjacentSpaces(citySpace).filter((s) => s.tile === undefined);
      if (neighbors.length >= 3) {
        game.addCity(owner, citySpace);
        game.addOcean(owner, neighbors[0]);
        game.addGreenery(owner, neighbors[1]);
        game.addGreenery(owner, neighbors[2]);
        return citySpace;
      }
    }
    throw new Error('could not find a space with 3 free neighbors for test setup');
  }

  it('grants nothing without a qualifying city', () => {
    game.addCity(player, game.board.getAvailableSpacesOnLand(player)[0]);
    const trBefore = player.terraformRating;

    card.play(player);

    expect(player.terraformRating).to.eq(trBefore);
  });

  it('raises the playing player\'s TR 2 steps per qualifying city', () => {
    buildQualifyingCity(player);
    const trBefore = player.terraformRating;

    card.play(player);

    expect(player.terraformRating).to.eq(trBefore + 2);
  });

  it('raises other players\' TR 1 step per qualifying city', () => {
    buildQualifyingCity(opponent);
    const trBefore = opponent.terraformRating;

    card.play(player);

    expect(opponent.terraformRating).to.eq(trBefore + 1);
  });
});
