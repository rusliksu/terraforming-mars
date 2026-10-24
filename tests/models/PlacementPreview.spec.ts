import {expect} from 'chai';
import {SelectSpace} from '../../src/server/inputs/SelectSpace';
import {PlaceTile} from '../../src/server/deferredActions/PlaceTile';
import {PlaceCityTile} from '../../src/server/deferredActions/PlaceCityTile';
import {PlaceGreeneryTile} from '../../src/server/deferredActions/PlaceGreeneryTile';
import {PlaceOceanTile} from '../../src/server/deferredActions/PlaceOceanTile';
import {ConvertPlants} from '../../src/server/cards/base/standardActions/ConvertPlants';
import {PlaceMoonMineTile} from '../../src/server/moon/PlaceMoonMineTile';
import {PlaceMoonHabitatTile} from '../../src/server/moon/PlaceMoonHabitatTile';
import {PlaceMoonRoadTile} from '../../src/server/moon/PlaceMoonRoadTile';
import {PlaceCloudCityTile} from '../../src/server/venusPhase2/PlaceCloudCityTile';
import {PlaceGasMineTile} from '../../src/server/venusPhase2/PlaceGasMineTile';
import {PlaceFloaterArrayTile} from '../../src/server/venusPhase2/PlaceFloaterArrayTile';
import {TileType} from '../../src/common/TileType';
import {testGame} from '../TestGame';
import {Server} from '../../src/server/models/ServerModel';
import {Phase} from '../../src/common/Phase';

describe('native placement display metadata', () => {
  it('projects final greenery only for the actual native production-phase root without mutating the input or board', () => {
    const [game, player] = testGame(1);
    player.popWaitingFor();
    player.plants = 8;
    game.phase = Phase.PRODUCTION;
    player.takeActionForFinalGreenery();
    const input = player.getWaitingFor();
    if (input === undefined) {
      throw new Error('Expected native final greenery input');
    }
    const raw = JSON.stringify(input.toModel(player));
    const board = JSON.stringify(game.board.spaces.map((space) => space.tile));
    const model = Server.getWaitingFor(player, input);
    if (model?.type !== 'or') {
      throw new Error('Expected native final greenery choice');
    }
    expect(model.options[0]).includes({type: 'space', tileType: TileType.GREENERY, finalGreenery: true});
    expect(model.options[1]).includes({type: 'option', title: "Don't place a greenery"});
    expect(JSON.stringify(input.toModel(player))).eq(raw);
    expect(player.getWaitingFor()).eq(input);
    expect(player.plants).eq(8);
    expect(JSON.stringify(game.board.spaces.map((space) => space.tile))).eq(board);
    game.phase = Phase.ACTION;
    const otherPhase = Server.getWaitingFor(player, input);
    if (otherPhase?.type !== 'or') {
      throw new Error('Expected same native options');
    }
    expect(otherPhase.options[0]).not.have.property('finalGreenery');
    expect(otherPhase.options[0]).not.have.property('tileType');
    game.phase = Phase.PRODUCTION;
    player.popWaitingFor();
    const stale = Server.getWaitingFor(player, input);
    if (stale?.type !== 'or') {
      throw new Error('Expected detached native options');
    }
    expect(stale.options[0]).not.have.property('finalGreenery');
  });

  it('projects the actual producer tile independently of its title without placing it', () => {
    const [game, player] = testGame(1);
    const before = JSON.stringify(game.board.spaces.map((space) => space.tile));
    const city = new PlaceCityTile(player, {title: 'An unrelated title'}).execute();
    expect(city?.toModel()).includes({tileType: TileType.CITY});
    expect(new PlaceGreeneryTile(player).execute()?.toModel()).includes({tileType: TileType.GREENERY});
    expect(new ConvertPlants().action(player).toModel()).includes({tileType: TileType.GREENERY});
    expect(new PlaceOceanTile(player, {title: 'Select space for city tile'}).execute()?.toModel()).includes({tileType: TileType.OCEAN});
    const special = new PlaceTile(player, {tile: {tileType: TileType.COMMERCIAL_DISTRICT}, on: 'land', title: 'Select a space'}).execute();
    expect(special.toModel()).includes({tileType: TileType.COMMERCIAL_DISTRICT});
    expect(JSON.stringify(game.board.spaces.map((space) => space.tile))).eq(before);
    const unknown = new SelectSpace('Select space for city tile', game.board.spaces).toModel();
    expect(unknown).not.have.property('tileType');
  });

  it('projects the six native Moon and Venus tile types without touching boards or tracks', () => {
    const [game, player] = testGame(1, {moonExpansion: true, venusPhase2Expansion: true});
    const cases = [
      [new PlaceMoonMineTile(player), TileType.MOON_MINE],
      [new PlaceMoonHabitatTile(player), TileType.MOON_HABITAT],
      [new PlaceMoonRoadTile(player), TileType.MOON_ROAD],
      [new PlaceCloudCityTile(player), TileType.VENUS_CLOUD_CITY],
      [new PlaceGasMineTile(player), TileType.VENUS_GAS_MINE],
      [new PlaceFloaterArrayTile(player), TileType.VENUS_FLOATER_ARRAY],
    ] as const;
    const before = JSON.stringify({moon: game.moonData, venus: game.venusPhase2Data});
    for (const [producer, tileType] of cases) {
      expect(producer.execute()?.toModel()).includes({tileType});
    }
    expect(JSON.stringify({moon: game.moonData, venus: game.venusPhase2Data})).eq(before);
  });
});
