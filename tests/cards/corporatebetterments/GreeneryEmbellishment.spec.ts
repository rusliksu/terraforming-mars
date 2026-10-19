import {expect} from 'chai';
import {GreeneryEmbellishment} from '../../../src/server/cards/corporatebetterments/GreeneryEmbellishment';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {EmptyBoard} from '../../testing/EmptyBoard';
import {TileType} from '../../../src/common/TileType';

describe('GreeneryEmbellishment', () => {
  let card: GreeneryEmbellishment;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new GreeneryEmbellishment();
    [game, player] = testGame(2);
    game.board = EmptyBoard.newInstance();
  });

  it('cannot play without 5 plant tags', () => {
    player.tagsForTest = {plant: 4};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 5 plant tags', () => {
    player.tagsForTest = {plant: 5};
    expect(card.canPlay(player)).is.true;
  });

  it('increases M€ production 2 steps for each city adjacent to a greenery', () => {
    player.tagsForTest = {plant: 5};
    // '09' is adjacent to greenery-at-'15'; '21' is not.
    game.simpleAddTile(player, game.board.getSpaceOrThrow('15'), {tileType: TileType.GREENERY});
    game.simpleAddTile(player, game.board.getSpaceOrThrow('09'), {tileType: TileType.CITY});
    game.simpleAddTile(player, game.board.getSpaceOrThrow('21'), {tileType: TileType.CITY});

    card.play(player);

    expect(player.production.megacredits).to.eq(2);
  });

  it('scores 2 flat victory points', () => {
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
