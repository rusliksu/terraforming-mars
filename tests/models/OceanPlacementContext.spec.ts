import {expect} from 'chai';
import {Phase} from '@/common/Phase';
import {TileType} from '@/common/TileType';
import {SpaceBonus} from '@/common/boards/SpaceBonus';
import {SpaceType} from '@/common/boards/SpaceType';
import {MarsBoard} from '@/server/boards/MarsBoard';
import {Server} from '@/server/models/ServerModel';
import {testGame} from '../TestGame';
import {forcePartiesInPlay, runAllActions, setRulingParty, setTemperature} from '../TestingUtils';
import {PartyName} from '@/common/turmoil/PartyName';
import {isSpaceId} from '@/common/Types';
import {DEFAULT_GLOBAL_PARAMETERS} from '@/common/GlobalParameterConfig';
import {cast} from '@/common/utils/utils';
import {SelectSpace} from '@/server/inputs/SelectSpace';

describe('OceanPlacementContext', () => {
  it('quotes temperature ocean bonuses without changing the game and matches actual placement', () => {
    const [game, player] = testGame(2);
    game.phase = Phase.ACTION;
    setTemperature(game, -4);
    const before = JSON.stringify(game.serialize());
    expect(Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!.temperatureBonus).deep.eq({
      temperature: -4, maxTemperature: 8,
      rises: [{steps: 1, oceans: 0}, {steps: 2, oceans: 1}, {steps: 3, oceans: 1}],
    });
    expect(JSON.stringify(game.serialize())).eq(before);
    const tr = player.terraformRating;
    game.increaseTemperature(player, 2);
    runAllActions(game);
    const input = cast(player.popWaitingFor(), SelectSpace);
    input.process({type: 'space', spaceId: input.spaces[0].id});
    runAllActions(game);
    expect(player.terraformRating - tr).eq(3);
    expect(Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!.temperatureBonus!.rises)
      .deep.eq([{steps: 1, oceans: 0}, {steps: 2, oceans: 0}, {steps: 3, oceans: 0}]);
  });

  it('uses configured bonus thresholds and caps their oceans at the remaining track', () => {
    const [game, player] = testGame(2, {globalParameters: {...DEFAULT_GLOBAL_PARAMETERS,
      temperature: {...DEFAULT_GLOBAL_PARAMETERS.temperature,
        bonuses: [{value: -4, kind: 'ocean'}, {value: -2, kind: 'ocean'}]},
    }});
    game.phase = Phase.ACTION;
    setTemperature(game, -6);
    const counts = () => Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!.temperatureBonus!.rises.map((row) => row.oceans);
    expect(counts()).deep.eq([1, 2, 2]);
    for (const space of game.board.getSpaces(SpaceType.OCEAN).slice(0, 8)) {
      space.tile = {tileType: TileType.OCEAN};
    }
    expect(counts()).deep.eq([1, 1, 1]);
    game.board.getSpaces(SpaceType.OCEAN)[8].tile = {tileType: TileType.OCEAN};
    expect(counts()).deep.eq([0, 0, 0]);
  });

  it('quotes the changed adjacency of a funded two-ocean order without changing the game', () => {
    const [game, player] = testGame(2, {aresExtension: true});
    game.phase = Phase.ACTION;
    game.aresData!.hazardData.erosionOceanCount.available = false;
    game.aresData!.hazardData.removeDustStormsOceanCount.available = false;
    player.oceanBonus = 3;
    player.megaCredits = 6;
    game.board = new MarsBoard([
      {id: '10', x: 0, y: 1, spaceType: SpaceType.OCEAN, bonus: [SpaceBonus.STEEL]},
      {id: '11', x: 1, y: 1, spaceType: SpaceType.OCEAN, bonus: [SpaceBonus.DRAW_CARD]},
      {id: '12', x: 0, y: 0, spaceType: SpaceType.OCEAN, bonus: [], tile: {tileType: TileType.OCEAN}},
      {id: '13', x: 0, y: 2, spaceType: SpaceType.LAND, bonus: [], adjacency: {cost: 4, bonus: []}},
      {id: '14', x: 2, y: 1, spaceType: SpaceType.LAND, bonus: [], adjacency: {cost: 5, bonus: []}},
      {id: '15', x: 2, y: 2, spaceType: SpaceType.LAND, bonus: []},
    ]);
    const before = JSON.stringify(game.serialize());
    const context = Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!;
    expect(context.pairs).deep.eq([
      {firstSpaceId: '10', secondSpaceId: '11', secondOceanAdjacencyBonus: 3},
      {firstSpaceId: '11', secondSpaceId: '10', secondOceanAdjacencyBonus: 6},
    ]);
    expect(context.spaces.map((row) => row.additionalCosts.megacredits)).deep.eq([4, 5]);
    expect(JSON.stringify(game.serialize())).eq(before);

    const steel = player.steel;
    const cards = player.cardsInHand.length;
    game.addOcean(player, game.board.getSpaceOrThrow('10'));
    runAllActions(game);
    expect(player.megaCredits).eq(5);
    expect(Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!.spaces[0].oceanAdjacencyBonus).eq(3);
    game.addOcean(player, game.board.getSpaceOrThrow('11'));
    runAllActions(game);
    expect(player.megaCredits).eq(3);
    expect(player.steel - steel).eq(1);
    expect(player.cardsInHand.length - cards).eq(1);
  });

  it('does not certify pairs with pending Ares board changes or only one ocean left', () => {
    const [game, player] = testGame(2, {aresExtension: true});
    game.phase = Phase.ACTION;
    expect(Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!.pairs).eq(undefined);
    game.aresData!.hazardData.erosionOceanCount.available = false;
    game.aresData!.hazardData.removeDustStormsOceanCount.available = false;
    expect(Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!.pairs!.length).greaterThan(0);
    for (const space of game.board.getSpaces(SpaceType.OCEAN).slice(0, 8)) {
      space.tile = {tileType: TileType.OCEAN};
    }
    expect(Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!.pairs).eq(undefined);
  });

  it('bounds pair enumeration without dropping single-placement candidates', () => {
    const [game, player] = testGame(2);
    game.phase = Phase.ACTION;
    const spaces = Array.from({length: 65}, (_, index) => {
      const id = String(index + 10);
      if (!isSpaceId(id)) {
        throw new Error('Invalid fixture ID');
      }
      return {id, x: index, y: 0, spaceType: SpaceType.OCEAN, bonus: []};
    });
    game.board = new MarsBoard(spaces);
    const context = Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!;
    expect(context.spaces.length).eq(65);
    expect(context.pairs).eq(undefined);
    game.board = new MarsBoard(spaces.slice(0, 64));
    expect(Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!.pairs!.length).eq(4032);
  });

  it('quotes own available cells without changing the game or exposing another player context', () => {
    const [game, player, other] = testGame(2);
    game.phase = Phase.ACTION;
    player.oceanBonus = 3;
    game.board = new MarsBoard([
      {id: '10', x: 0, y: 1, spaceType: SpaceType.OCEAN, bonus: [SpaceBonus.STEEL, SpaceBonus.DRAW_CARD]},
      {id: '11', x: 0, y: 0, spaceType: SpaceType.OCEAN, bonus: [], tile: {tileType: TileType.OCEAN}},
      {id: '12', x: 1, y: 1, spaceType: SpaceType.OCEAN, bonus: [], tile: {tileType: TileType.WETLANDS}},
      {id: '13', x: 0, y: 2, spaceType: SpaceType.OCEAN, bonus: [], player: other},
      {id: '14', x: 1, y: 0, spaceType: SpaceType.OCEAN, bonus: [], player},
      {id: '15', x: 1, y: 2, spaceType: SpaceType.OCEAN, bonus: [], tile: {tileType: TileType.GREENERY}},
    ]);
    const before = JSON.stringify(game.serialize());
    const model = Server.getPlayerModel(player);
    const context = model.thisPlayer.oceanPlacementContext;
    expect(context).not.eq(undefined);
    expect(context!.version).eq(1);
    expect(context!.color).eq(player.color);
    expect(context!.generation).eq(game.generation);
    expect(context!.step).eq(model.game.step);
    // Wetlands doesn't advance the ocean track.
    expect(context!.oceans).eq(1);
    expect(context!.maxOceans).eq(9);
    expect(context!.spaces.map((space) => space.id)).deep.eq(['10', '14']);
    expect(context!.spaces[0]).deep.eq({
      id: '10', bonus: [1, 3], oceanAdjacencyBonus: 6, costsKnown: true,
      additionalCosts: {megacredits: 0, production: {mild: 0, severe: 0}, tr: {}},
    });
    expect(model.players.find((p) => p.color === other.color)!.oceanPlacementContext).eq(undefined);
    expect(Server.getSpectatorModel(game).players.every((p) => p.oceanPlacementContext === undefined)).is.true;
    expect(JSON.stringify(game.serialize())).eq(before);

    player.oceanBonus = 2;
    expect(Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!.spaces[0].oceanAdjacencyBonus).eq(4);
    const money = player.megaCredits;
    const steel = player.steel;
    const cards = player.cardsInHand.length;
    game.addOcean(player, game.board.getSpaceOrThrow('10'));
    expect(player.megaCredits - money).eq(4);
    expect(player.steel - steel).eq(1);
    expect(player.cardsInHand.length - cards).eq(1);
    expect(Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!.spaces.map((space) => space.id)).deep.eq(['14']);
  });

  it('reports Ares cash costs without charging ocean hazard-adjacency production', () => {
    const [game, player] = testGame(2, {aresExtension: true});
    game.phase = Phase.ACTION;
    game.board = new MarsBoard([
      {id: '10', x: 0, y: 1, spaceType: SpaceType.OCEAN, bonus: []},
      {id: '11', x: 1, y: 1, spaceType: SpaceType.LAND, bonus: [],
        tile: {tileType: TileType.DUST_STORM_SEVERE}, adjacency: {cost: 4, bonus: []}},
      {id: '12', x: 0, y: 2, spaceType: SpaceType.LAND, bonus: []},
    ]);
    const row = Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!.spaces[0];
    expect(row.additionalCosts).deep.eq({megacredits: 4, production: {mild: 0, severe: 0}, tr: {}});
    expect(row.costsKnown).is.true;
    player.megaCredits = 10;
    const production = player.production.asUnits();
    game.addOcean(player, game.board.getSpaceOrThrow('10'));
    runAllActions(game);
    expect(player.megaCredits).eq(6);
    expect(player.production.asUnits()).deep.eq(production);
  });

  it('omits context outside actions and does not offer cells after the ocean limit', () => {
    const [game, player] = testGame(2);
    game.phase = Phase.SOLAR;
    expect(Server.getPlayerModel(player).thisPlayer.oceanPlacementContext).eq(undefined);
    game.phase = Phase.ACTION;
    for (const space of game.board.getSpaces(SpaceType.OCEAN).slice(0, 9)) {
      space.tile = {tileType: TileType.OCEAN};
    }
    expect(Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!.spaces).deep.eq([]);
  });

  it('does not certify costs under either Reds tile-payment policy', () => {
    const restore = forcePartiesInPlay(PartyName.REDS);
    try {
      for (const morePartiesExpansion of [false, true]) {
        const [game, player] = testGame(2, {turmoilExtension: true, morePartiesExpansion});
        setRulingParty(game, PartyName.REDS, morePartiesExpansion ? 'rp03' : 'rp02');
        expect(Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!.spaces.every((row) => !row.costsKnown)).is.true;
        expect(Server.getPlayerModel(player).thisPlayer.oceanPlacementContext!.pairs).eq(undefined);
      }
    } finally {
      restore();
    }
  });
});
