import {expect} from 'chai';
import {ExportsFromAmalthea} from '../../../src/server/cards/robantilles/ExportsFromAmalthea';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {TileType} from '../../../src/common/TileType';
import {SpaceName} from '../../../src/common/boards/SpaceName';

describe('ExportsFromAmalthea', () => {
  let card: ExportsFromAmalthea;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new ExportsFromAmalthea();
    [game, player] = testGame(1);
  });

  it('cannot play without an offworld city', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('cannot play with only an on-Mars city', () => {
    const landSpace = game.board.getAvailableSpacesOnLand(player)[0];
    game.simpleAddTile(player, landSpace, {tileType: TileType.CITY});
    expect(card.canPlay(player)).is.false;
  });

  it('can play with an offworld city', () => {
    game.simpleAddTile(player, game.board.getSpaceOrThrow(SpaceName.GANYMEDE_COLONY), {tileType: TileType.CITY});
    expect(card.canPlay(player)).is.true;
  });

  it('increases M€ production 4 steps on play', () => {
    game.simpleAddTile(player, game.board.getSpaceOrThrow(SpaceName.GANYMEDE_COLONY), {tileType: TileType.CITY});
    card.play(player);
    expect(player.production.megacredits).to.eq(4);
  });
});
