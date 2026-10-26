import {expect} from 'chai';
import {IGame} from '../../src/server/IGame';
import {VenusPhase2Expansion} from '../../src/server/venusPhase2/VenusPhase2Expansion';
import {TestPlayer} from '../TestPlayer';
import {testGame} from '../TestingUtils';
import {TileType} from '../../src/common/TileType';
import {VictoryPointsBreakdownBuilder} from '../../src/server/game/VictoryPointsBreakdownBuilder';
import {Space} from '../../src/server/boards/Space';

describe('VenusPhase2Expansion', () => {
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    [game, player, player2] = testGame(2, {venusPhase2Expansion: true});
  });

  it('addFloaterArrayTile places the tile and assigns ownership', () => {
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    const [space] = venusSurface.getAvailableSpacesForLand(player);
    VenusPhase2Expansion.addFloaterArrayTile(player, space.id);
    expect(space.player).eq(player);
    expect(space.tile).deep.eq({tileType: TileType.VENUS_FLOATER_ARRAY, card: undefined});
  });

  it('addTile fails on an occupied space', () => {
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    const [space] = venusSurface.getAvailableSpacesForLand(player);
    VenusPhase2Expansion.addFloaterArrayTile(player, space.id);
    expect(() => VenusPhase2Expansion.addCloudCityTile(player, space.id)).to.throw(/occupied/);
  });

  // Find two adjacent LAND spaces on the surface board -- used to set up the VP-adjacency tests
  // without depending on the exact layout (any two neighbors that are both plain land work).
  function findAdjacentLandPair(): [Space, Space] {
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    for (const space of venusSurface.getAvailableSpacesForLand(player)) {
      const adjacentLand = venusSurface.getAdjacentSpaces(space).find((adj) =>
        venusSurface.getAvailableSpacesForLand(player).some((s) => s.id === adj.id));
      if (adjacentLand !== undefined) {
        return [space, adjacentLand];
      }
    }
    throw new Error('No adjacent land pair found -- board layout changed?');
  }

  it('a Cloud City scores 1 VP per adjacent Floater Array', () => {
    const [cityPlace, arrayPlace] = findAdjacentLandPair();
    VenusPhase2Expansion.addCloudCityTile(player, cityPlace.id);
    VenusPhase2Expansion.addFloaterArrayTile(player, arrayPlace.id);

    const builder = new VictoryPointsBreakdownBuilder();
    VenusPhase2Expansion.calculateVictoryPoints(player, builder);
    expect(builder.build().venusCloudCities).to.eq(1);
    expect(builder.build().venusGasMines).to.eq(0);
  });

  it('a Floater Array itself never scores VP directly', () => {
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    const [space] = venusSurface.getAvailableSpacesForLand(player);
    VenusPhase2Expansion.addFloaterArrayTile(player, space.id);

    const builder = new VictoryPointsBreakdownBuilder();
    VenusPhase2Expansion.calculateVictoryPoints(player, builder);
    const breakdown = builder.build();
    expect(breakdown.venusCloudCities).to.eq(0);
    expect(breakdown.venusGasMines).to.eq(0);
  });

  it('only the adjacent tile\'s owner scores it -- not the Floater Array\'s owner', () => {
    const [cityPlace, arrayPlace] = findAdjacentLandPair();
    VenusPhase2Expansion.addCloudCityTile(player, cityPlace.id);
    VenusPhase2Expansion.addFloaterArrayTile(player2, arrayPlace.id);

    const builder = new VictoryPointsBreakdownBuilder();
    VenusPhase2Expansion.calculateVictoryPoints(player, builder);
    expect(builder.build().venusCloudCities).to.eq(1);

    const builder2 = new VictoryPointsBreakdownBuilder();
    VenusPhase2Expansion.calculateVictoryPoints(player2, builder2);
    expect(builder2.build().venusCloudCities).to.eq(0);
    expect(builder2.build().venusGasMines).to.eq(0);
  });

  it('does nothing when the expansion is disabled', () => {
    const [otherGame, otherPlayer] = testGame(2, {venusPhase2Expansion: false});
    const builder = new VictoryPointsBreakdownBuilder();
    VenusPhase2Expansion.calculateVictoryPoints(otherPlayer, builder);
    expect(builder.build().venusCloudCities).to.eq(0);
    expect(otherGame.venusPhase2Data).is.undefined;
  });
});
