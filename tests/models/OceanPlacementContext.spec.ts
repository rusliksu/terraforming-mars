import {expect} from 'chai';
import {Phase} from '@/common/Phase';
import {TileType} from '@/common/TileType';
import {SpaceBonus} from '@/common/boards/SpaceBonus';
import {SpaceType} from '@/common/boards/SpaceType';
import {MarsBoard} from '@/server/boards/MarsBoard';
import {Server} from '@/server/models/ServerModel';
import {testGame} from '../TestGame';
import {forcePartiesInPlay, runAllActions, setRulingParty} from '../TestingUtils';
import {PartyName} from '@/common/turmoil/PartyName';

describe('OceanPlacementContext', () => {
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
      }
    } finally {
      restore();
    }
  });
});
