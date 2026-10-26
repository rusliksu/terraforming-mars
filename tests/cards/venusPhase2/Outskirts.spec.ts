import {expect} from 'chai';
import {Outskirts} from '../../../src/server/cards/venusPhase2/Outskirts';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {addCity, runAllActions, setOxygenLevel} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {cast} from '../../../src/common/utils/utils';

describe('Outskirts', () => {
  let card: Outskirts;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new Outskirts();
    [game, player, player2] = testGame(2);
  });

  it('requires 13% oxygen', () => {
    expect(card.canPlay(player)).is.false;
    setOxygenLevel(game, 13);
    addCity(player2);
    expect(card.canPlay(player)).is.true;
  });

  it('cannot play without a space adjacent to a city', () => {
    setOxygenLevel(game, 13);
    expect(card.canPlay(player)).is.false;
  });

  it('places a City adjacent to another city, decreases its owner\'s energy, and increases the player\'s M€', () => {
    setOxygenLevel(game, 13);
    const opponentCity = addCity(player2);
    player2.production.override({energy: 1});

    card.play(player);
    runAllActions(game);
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const target = selectSpace.spaces[0];
    expect(game.board.getAdjacentSpaces(target)).to.include(opponentCity);

    selectSpace.cb(target);

    expect(target.tile?.tileType).to.eq(TileType.CITY);
    expect(player2.production.energy).to.eq(0);
    expect(player.production.megacredits).to.eq(2);
  });
});
