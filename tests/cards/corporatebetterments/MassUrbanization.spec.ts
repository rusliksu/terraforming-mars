import {expect} from 'chai';
import {MassUrbanization} from '../../../src/server/cards/corporatebetterments/MassUrbanization';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {runAllActions, addCity} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';

describe('MassUrbanization', () => {
  let card: MassUrbanization;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new MassUrbanization();
    [game, player] = testGame(2);
  });

  it('requires 3 cities', () => {
    expect(card.canPlay(player)).is.false;
    addCity(player);
    addCity(player);
    expect(card.canPlay(player)).is.false;
    addCity(player);
    expect(card.canPlay(player)).is.true;
  });

  it('places 3 city tiles', () => {
    addCity(player);
    addCity(player);
    addCity(player);
    const citiesBefore = game.board.getCities(player).length;

    card.play(player);

    for (let i = 0; i < 3; i++) {
      const selectSpace = cast(game.deferredActions.pop()?.execute(), SelectSpace);
      selectSpace.cb(selectSpace.spaces[0]);
    }
    runAllActions(game);

    expect(game.board.getCities(player)).has.lengthOf(citiesBefore + 3);
  });

  it('is worth 3 victory points', () => {
    expect(card.getVictoryPoints(player)).to.eq(3);
  });
});
