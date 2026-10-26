import {expect} from 'chai';
import {FlyingGarden} from '../../../src/server/cards/idesofmars/FlyingGarden';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {TileType} from '../../../src/common/TileType';
import {SpaceName} from '../../../src/common/boards/SpaceName';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {cast} from '../../../src/common/utils/utils';
import {Resource} from '../../../src/common/Resource';

describe('FlyingGarden', () => {
  let card: FlyingGarden;
  let game: IGame;
  let player: TestPlayer;

  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.SPOME);
    card = new FlyingGarden();
    [game, player] = testGame(1, {turmoilExtension: true, idesOfMarsExpansion: true, morePartiesExpansion: true, moonExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without Spome ruling or 2 delegates, or without an off-world city', () => {
    player.megaCredits = 20;
    player.production.add(Resource.ENERGY, 1);
    expect(card.canPlay(player)).is.false;

    setRulingParty(game, PartyName.SPOME);
    expect(card.canPlay(player)).is.false; // still no off-world city

    game.simpleAddTile(player, game.board.getSpaceOrThrow(SpaceName.GANYMEDE_COLONY), {tileType: TileType.CITY});
    expect(card.canPlay(player)).is.true;
  });

  it('places a greenery adjacent to the off-world city without raising oxygen, and adjusts production', () => {
    player.megaCredits = 20;
    player.production.add(Resource.ENERGY, 1);
    setRulingParty(game, PartyName.SPOME);
    game.simpleAddTile(player, game.board.getSpaceOrThrow(SpaceName.GANYMEDE_COLONY), {tileType: TileType.CITY});

    const oxygenBefore = game.getOxygenLevel();
    const selectSpace = cast(card.play(player), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);

    expect(game.getOxygenLevel()).to.eq(oxygenBefore);
    expect(selectSpace.spaces[0].tile?.tileType).to.eq(TileType.GREENERY);
    expect(player.production.energy).to.eq(0);
    expect(player.production.plants).to.eq(1);
  });
});
