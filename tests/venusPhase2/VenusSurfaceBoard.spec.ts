import {expect} from 'chai';
import {IGame} from '../../src/server/IGame';
import {VenusPhase2Expansion} from '../../src/server/venusPhase2/VenusPhase2Expansion';
import {TestPlayer} from '../TestPlayer';
import {testGame} from '../TestingUtils';
import {SpaceType} from '../../src/common/boards/SpaceType';
import {TileType} from '../../src/common/TileType';
import {VENUS_STRATOPOLIS, VENUS_MAXWELL_BASE} from '../../src/server/venusPhase2/VenusSurfaceBoard';

describe('VenusSurfaceBoard', () => {
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    [game, player] = testGame(2, {venusPhase2Expansion: true});
  });

  it('reserves Stratopolis and Maxwell Base on the default board\'s own hard-coded grid spots', () => {
    const [venusGame] = testGame(2, {venusPhase2Expansion: true, venusNextExtension: true});
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(venusGame).venusSurface;
    const stratopolis = venusSurface.getSpaceOrThrow(VENUS_STRATOPOLIS);
    const maxwellBase = venusSurface.getSpaceOrThrow(VENUS_MAXWELL_BASE);
    expect(stratopolis.spaceType).to.eq(SpaceType.COLONY);
    expect(maxwellBase.spaceType).to.eq(SpaceType.COLONY);
    // On the grid (a real position), not the off-grid fallback -- the shipped default reserves
    // both on its own hexagon rather than leaving them in the separate off-grid tray.
    expect(stratopolis.x).to.not.eq(-1);
    expect(maxwellBase.x).to.not.eq(-1);
    // Excluded from normal tile placement, same as any other COLONY-type space.
    expect(venusSurface.getAvailableSpacesForLand(player).map((s) => s.id)).to.not.include(stratopolis.id);
    expect(venusSurface.getAvailableSpacesForLand(player).map((s) => s.id)).to.not.include(maxwellBase.id);
  });

  it('does not reserve Stratopolis/Maxwell Base spots when Venus is not in play', () => {
    const [venuslessGame] = testGame(2, {venusPhase2Expansion: true, venusNextExtension: false});
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(venuslessGame).venusSurface;
    expect(() => venusSurface.getSpaceOrThrow(VENUS_STRATOPOLIS)).to.throw();
    expect(() => venusSurface.getSpaceOrThrow(VENUS_MAXWELL_BASE)).to.throw();
  });

  it('has both land and gaslight spaces available before anything is built', () => {
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    expect(venusSurface.getAvailableSpacesForLand(player).length).to.be.greaterThan(0);
    expect(venusSurface.getAvailableSpacesForGaslight(player).length).to.be.greaterThan(0);
  });

  it('getAvailableSpacesForLand never includes a gaslight space', () => {
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    const landSpaces = venusSurface.getAvailableSpacesForLand(player);
    expect(landSpaces.every((space) => space.spaceType === SpaceType.LAND)).is.true;
  });

  it('getAvailableSpacesForGaslight never includes a plain land space', () => {
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    const gaslightSpaces = venusSurface.getAvailableSpacesForGaslight(player);
    expect(gaslightSpaces.every((space) => space.spaceType === SpaceType.GASLIGHT)).is.true;
  });

  it('excludes an occupied space from either availability list', () => {
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    const [aLandSpace] = venusSurface.getAvailableSpacesForLand(player);
    VenusPhase2Expansion.addFloaterArrayTile(player, aLandSpace.id);
    expect(venusSurface.getAvailableSpacesForLand(player).map((s) => s.id)).to.not.include(aLandSpace.id);
  });

  it('adjacency works generically for this board, same as any other Board subclass', () => {
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    const [aSpace] = venusSurface.getAvailableSpacesForLand(player);
    // Just proving getAdjacentSpaces runs without throwing and returns *some* real spaces.
    const adjacent = venusSurface.getAdjacentSpaces(aSpace);
    expect(adjacent.length).to.be.greaterThan(0);
    for (const adj of adjacent) {
      expect(venusSurface.spaces).to.include(adj);
    }
  });

  it('places a Gas Mine tile on a gaslight space', () => {
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    const [aGaslightSpace] = venusSurface.getAvailableSpacesForGaslight(player);
    VenusPhase2Expansion.addGasMineTile(player, aGaslightSpace.id);
    expect(venusSurface.getSpaceOrThrow(aGaslightSpace.id).tile?.tileType).to.eq(TileType.VENUS_GAS_MINE);
  });
});
