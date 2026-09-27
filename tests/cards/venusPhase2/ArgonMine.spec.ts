import {expect} from 'chai';
import {ArgonMine} from '../../../src/server/cards/venusPhase2/ArgonMine';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {cast} from '../../../src/common/utils/utils';

describe('ArgonMine', () => {
  let card: ArgonMine;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ArgonMine();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
  });

  it('cannot play without an available gas mine space', () => {
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    for (const space of venusSurface.getAvailableSpacesForGaslight(player)) {
      VenusPhase2Expansion.addFloaterArrayTile(player, space.id);
    }
    expect(card.canPlay(player)).is.false;
  });

  it('raises Venus, increases production, and places a Gas Mine tile', () => {
    const venusBefore = game.getVenusScaleLevel();
    card.play(player);
    runAllActions(game);
    expect(game.getVenusScaleLevel()).to.eq(venusBefore + 2);
    expect(player.production.heat).to.eq(1);
    expect(player.production.megacredits).to.eq(2);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const target = selectSpace.spaces[0];
    selectSpace.cb(target);
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    expect(venusSurface.getSpaceOrThrow(target.id).tile?.tileType).to.eq(TileType.VENUS_GAS_MINE);
  });
});
