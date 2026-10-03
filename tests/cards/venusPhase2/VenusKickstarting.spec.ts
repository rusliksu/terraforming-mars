import {expect} from 'chai';
import {VenusKickstarting} from '../../../src/server/cards/venusPhase2/VenusKickstarting';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {cast} from '../../../src/common/utils/utils';

describe('VenusKickstarting', () => {
  let card: VenusKickstarting;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new VenusKickstarting();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
  });

  it('requires Venus 16% or less', () => {
    expect(card.canPlay(player)).is.true;
    game.increaseVenusScaleLevel(player, 3);
    game.increaseVenusScaleLevel(player, 3);
    game.increaseVenusScaleLevel(player, 3);
    game.increaseVenusScaleLevel(player, 3);
    game.increaseVenusScaleLevel(player, 3);
    game.increaseVenusScaleLevel(player, 2);
    expect(game.getVenusScaleLevel()).to.eq(34);
    expect(card.canPlay(player)).is.false;
  });

  it('places 2 Floating Array tiles on Venus', () => {
    card.play(player);
    runAllActions(game);

    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    const first = cast(player.popWaitingFor(), SelectSpace);
    const firstTarget = first.spaces[0];
    first.cb(firstTarget);
    runAllActions(game);
    expect(venusSurface.getSpaceOrThrow(firstTarget.id).tile?.tileType).to.eq(TileType.VENUS_FLOATER_ARRAY);

    const second = cast(player.popWaitingFor(), SelectSpace);
    const secondTarget = second.spaces[0];
    second.cb(secondTarget);
    expect(venusSurface.getSpaceOrThrow(secondTarget.id).tile?.tileType).to.eq(TileType.VENUS_FLOATER_ARRAY);
  });
});
