import {expect} from 'chai';
import {KryptonMine} from '../../../src/server/cards/venusPhase2/KryptonMine';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {cast} from '../../../src/common/utils/utils';

describe('KryptonMine', () => {
  let card: KryptonMine;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new KryptonMine();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
  });

  it('raises Venus, increases production, and places a Gas Mine tile', () => {
    const venusBefore = game.getVenusScaleLevel();
    card.play(player);
    runAllActions(game);
    expect(game.getVenusScaleLevel()).to.eq(venusBefore + 2);
    expect(player.production.heat).to.eq(2);
    expect(player.production.energy).to.eq(1);
    expect(player.production.megacredits).to.eq(2);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const target = selectSpace.spaces[0];
    selectSpace.cb(target);
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    expect(venusSurface.getSpaceOrThrow(target.id).tile?.tileType).to.eq(TileType.VENUS_GAS_MINE);
  });
});
