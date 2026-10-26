import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {GalaxyExpress} from '@/server/cards/idesofmars/GalaxyExpress';
import {ColonyName} from '@/common/colonies/ColonyName';
import {Resource} from '@/common/Resource';
import {PartyName} from '@/common/turmoil/PartyName';
import {SpaceName} from '@/common/boards/SpaceName';
import {TileType} from '@/common/TileType';
import {VenusPhase2Expansion} from '@/server/venusPhase2/VenusPhase2Expansion';
import {setRulingParty} from '../../TestingUtils';

describe('GalaxyExpress', () => {
  it('requires Unity ruling or two delegates, and energy production to spend', () => {
    const [game, player] = testGame(2, {turmoilExtension: true});
    const card = new GalaxyExpress();
    player.production.add(Resource.ENERGY, 1);
    setRulingParty(game, PartyName.GREENS);
    expect(card.canPlay(player)).is.false;

    const unity = game.turmoil!.getPartyByName(PartyName.UNITY);
    unity.delegates.add(player);
    expect(card.canPlay(player)).is.false;
    unity.delegates.add(player);
    expect(card.canPlay(player)).is.true;

    player.production.add(Resource.ENERGY, -1);
    expect(card.canPlay(player)).is.false;
    unity.delegates.clear();
    setRulingParty(game, PartyName.UNITY);
    expect(card.canPlay(player)).is.false;
    player.production.add(Resource.ENERGY, 1);
    expect(card.canPlay(player)).is.true;
  });

  it('raises production per off-Mars city and occupied colony tile, regardless of owner', () => {
    const [game, player, opponent] = testGame(2, {
      turmoilExtension: true,
      venusPhase2Expansion: true,
      coloniesExtension: true,
      customColoniesList: [ColonyName.GANYMEDE, ColonyName.LUNA, ColonyName.PLUTO, ColonyName.TITAN, ColonyName.TRITON],
    });
    const card = new GalaxyExpress();
    setRulingParty(game, PartyName.UNITY);
    player.production.add(Resource.ENERGY, 2);
    game.simpleAddTile(player, game.board.getSpaceOrThrow(SpaceName.GANYMEDE_COLONY), {tileType: TileType.CITY});
    game.simpleAddTile(opponent, game.board.getSpaceOrThrow(SpaceName.PHOBOS_SPACE_HAVEN), {tileType: TileType.CITY});
    game.simpleAddTile(player, game.board.getAvailableSpacesOnLand(player)[0], {tileType: TileType.CITY});
    const venus = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    VenusPhase2Expansion.addCloudCityTile(opponent, venus.getAvailableSpacesForLand(opponent)[0].id);
    game.colonies[0].colonies = [player.id, opponent.id];
    game.colonies[1].colonies = [player.id];
    game.colonies[2].colonies = [opponent.id];
    player.megaCredits = 20;

    expect(card.canPlay(player)).is.true;
    card.play(player);

    expect(player.production.megacredits).eq(6);
    expect(player.production.energy).eq(1);
    expect(player.megaCredits).eq(20);
    expect(card.getVictoryPoints(player)).eq(1);
  });
});
