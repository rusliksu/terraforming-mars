import {expect} from 'chai';
import {CoolingPillars} from '../../../src/server/cards/venusPhase2/CoolingPillars';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {cast} from '../../../src/common/utils/utils';

describe('CoolingPillars', () => {
  let card: CoolingPillars;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new CoolingPillars();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
  });

  it('raises Venus, increases energy production, and places a Floating Array tile', () => {
    const venusBefore = game.getVenusScaleLevel();
    card.play(player);
    runAllActions(game);
    expect(game.getVenusScaleLevel()).to.eq(venusBefore + 2);
    expect(player.production.energy).to.eq(1);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const target = selectSpace.spaces[0];
    selectSpace.cb(target);
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    expect(venusSurface.getSpaceOrThrow(target.id).tile?.tileType).to.eq(TileType.VENUS_FLOATER_ARRAY);
  });
});
