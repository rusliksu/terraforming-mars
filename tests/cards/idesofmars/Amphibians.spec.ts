import {expect} from 'chai';
import {Amphibians} from '../../../src/server/cards/idesofmars/Amphibians';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions, setTemperature} from '../../TestingUtils';
import {Space} from '../../../src/server/boards/Space';
import {TileType} from '../../../src/common/TileType';

describe('Amphibians', () => {
  let card: Amphibians;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;
  let space: Space;

  beforeEach(() => {
    card = new Amphibians();
    [game, player, player2] = testGame(2);
    space = game.board.getAvailableSpacesForOcean(player)[0];
  });

  it('cannot play below -12 C', () => {
    setTemperature(game, -14);
    expect(card.canPlay(player)).is.false;
  });

  it('can play at -12 C', () => {
    setTemperature(game, -12);
    expect(card.canPlay(player)).is.true;
  });

  it('adds an animal when the card owner places an ocean tile', () => {
    player.playedCards.push(card);
    expect(card.resourceCount).eq(0);

    space.tile = {tileType: TileType.OCEAN};
    card.onTilePlaced(player, player, space);
    runAllActions(game);

    expect(card.resourceCount).eq(1);
  });

  it('does not add an animal for non-ocean tiles', () => {
    player.playedCards.push(card);

    space.tile = {tileType: TileType.GREENERY};
    card.onTilePlaced(player, player, space);
    runAllActions(game);

    expect(card.resourceCount).eq(0);
  });

  it('does not add an animal when another player places the tile', () => {
    player.playedCards.push(card);

    space.tile = {tileType: TileType.OCEAN};
    card.onTilePlaced(player, player2, space);
    runAllActions(game);

    expect(card.resourceCount).eq(0);
  });

  it('scores 1 VP per animal on this card', () => {
    player.addResourceTo(card, 3);
    expect(card.getVictoryPoints(player)).to.eq(3);
  });
});
