import {expect} from 'chai';
import {cast} from '../../../src/common/utils/utils';
import {Slum} from '../../../src/server/cards/idesofmars/Slum';
import {IGame} from '../../../src/server/IGame';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {addCity, runAllActions} from '../../TestingUtils';

describe('Slum', () => {
  let card: Slum;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Slum();
    [game, player] = testGame(1);
    // The card decreases energy production, so a baseline is needed regardless of the cities test.
    player.production.override({energy: 1});
  });

  it('cannot play with more than 4 cities on Mars', () => {
    for (let i = 0; i < 4; i++) {
      addCity(player);
    }
    expect(card.canPlay(player)).is.true;

    addCity(player);
    expect(card.canPlay(player)).is.false;
  });

  it('changes production and places a city on play', () => {
    player.production.override({energy: 2});

    cast(card.play(player), undefined);
    runAllActions(game);
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);

    expect(player.production.energy).eq(1);
    expect(player.production.megacredits).eq(1);
    expect(game.board.getCities(player)).has.length(1);
  });

  it('scores -1 VP', () => {
    expect(card.getVictoryPoints(player)).eq(-1);
  });
});
