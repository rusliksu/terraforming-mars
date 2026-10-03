import {expect} from 'chai';
import {NewBabylon} from '../../../src/server/cards/venusPhase2/NewBabylon';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {cast} from '../../../src/common/utils/utils';

describe('NewBabylon', () => {
  let card: NewBabylon;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new NewBabylon();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
  });

  it('requires Venus 12%', () => {
    expect(card.canPlay(player)).is.false;
    game.increaseVenusScaleLevel(player, 3);
    game.increaseVenusScaleLevel(player, 3);
    game.increaseVenusScaleLevel(player, 3);
    game.increaseVenusScaleLevel(player, 3);
    expect(card.canPlay(player)).is.true;
  });

  it('raises Venus, increases plant production, and places a Venus Habitat tile on Venus', () => {
    const venusBefore = game.getVenusScaleLevel();
    card.play(player);
    runAllActions(game);
    expect(game.getVenusScaleLevel()).to.eq(venusBefore + 2);
    expect(player.production.plants).to.eq(2);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const target = selectSpace.spaces[0];
    selectSpace.cb(target);
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    expect(venusSurface.getSpaceOrThrow(target.id).tile?.tileType).to.eq(TileType.VENUS_CLOUD_CITY);
  });
});
