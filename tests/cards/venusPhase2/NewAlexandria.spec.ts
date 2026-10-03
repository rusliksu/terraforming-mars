import {expect} from 'chai';
import {NewAlexandria} from '../../../src/server/cards/venusPhase2/NewAlexandria';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {cast} from '../../../src/common/utils/utils';

describe('NewAlexandria', () => {
  let card: NewAlexandria;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new NewAlexandria();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
    player.production.override({energy: 1});
  });

  it('requires Venus 6%', () => {
    expect(card.canPlay(player)).is.false;
    game.increaseVenusScaleLevel(player, 3);
    game.increaseVenusScaleLevel(player, 3);
    expect(card.canPlay(player)).is.true;
  });

  it('raises Venus, adjusts production, and places a Venus Habitat tile on Venus', () => {
    game.increaseVenusScaleLevel(player, 3);
    game.increaseVenusScaleLevel(player, 3);
    const venusBefore = game.getVenusScaleLevel();
    card.play(player);
    runAllActions(game);
    expect(game.getVenusScaleLevel()).to.eq(venusBefore + 2);
    expect(player.production.energy).to.eq(0);
    expect(player.production.megacredits).to.eq(3);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const target = selectSpace.spaces[0];
    selectSpace.cb(target);
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    expect(venusSurface.getSpaceOrThrow(target.id).tile?.tileType).to.eq(TileType.VENUS_CLOUD_CITY);
  });
});
