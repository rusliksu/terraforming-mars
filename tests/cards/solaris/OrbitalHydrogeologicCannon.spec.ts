import {expect} from 'chai';
import {OrbitalHydrogeologicCannon} from '../../../src/server/cards/solaris/OrbitalHydrogeologicCannon';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions, maxOutOceans, testRedsCosts} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {Resource} from '../../../src/common/Resource';

describe('OrbitalHydrogeologicCannon', () => {
  let card: OrbitalHydrogeologicCannon;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new OrbitalHydrogeologicCannon();
    [game, player] = testGame(1);
  });

  it('decreases energy production 3 steps when played', () => {
    player.production.add(Resource.ENERGY, 3);
    card.play(player);
    expect(player.production.energy).to.eq(0);
  });

  it('places an ocean tile on action', () => {
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);
    expect(game.board.getOceanSpaces()).has.lengthOf(1);
  });

  it('scores 3 VP per Galactic tag owned, including this', () => {
    player.tagsForTest = {galactic: 3};
    expect(card.getVictoryPoints(player)).eq(12);
  });

  it('Works with reds', () => {
    const [, player] = testGame(1, {turmoilExtension: true});
    testRedsCosts(() => card.canAct(player), player, 0, 3);
  });

  it('Works with reds, oceans maxed', () => {
    const [, player] = testGame(1, {turmoilExtension: true});
    maxOutOceans(player);
    testRedsCosts(() => card.canAct(player), player, 0, 0);
  });
});
