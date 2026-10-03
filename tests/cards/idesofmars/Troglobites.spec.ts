import {expect} from 'chai';
import {Troglobites} from '../../../src/server/cards/idesofmars/Troglobites';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions, setOxygenLevel} from '../../TestingUtils';
import {Space} from '../../../src/server/boards/Space';
import {TileType} from '../../../src/common/TileType';

describe('Troglobites', () => {
  let card: Troglobites;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;
  let space: Space;

  beforeEach(() => {
    card = new Troglobites();
    [game, player, player2] = testGame(2);
    space = game.board.getAvailableSpacesForGreenery(player)[0];
  });

  it('cannot play below 5% oxygen', () => {
    setOxygenLevel(game, 4);
    expect(card.canPlay(player)).is.false;
  });

  it('can play at 5% oxygen', () => {
    setOxygenLevel(game, 5);
    expect(card.canPlay(player)).is.true;
  });

  it('adds an animal when the card owner places a special tile', () => {
    player.playedCards.push(card);
    expect(card.resourceCount).eq(0);

    space.tile = {tileType: TileType.MINING_RIGHTS};
    card.onTilePlaced(player, player, space);
    runAllActions(game);

    expect(card.resourceCount).eq(1);
  });

  it('does not add an animal for non-special tiles', () => {
    player.playedCards.push(card);

    space.tile = {tileType: TileType.GREENERY};
    card.onTilePlaced(player, player, space);
    runAllActions(game);

    expect(card.resourceCount).eq(0);
  });

  it('does not add an animal when another player places the tile', () => {
    player.playedCards.push(card);

    space.tile = {tileType: TileType.MINING_RIGHTS};
    card.onTilePlaced(player, player2, space);
    runAllActions(game);

    expect(card.resourceCount).eq(0);
  });

  it('scores 3 VP per 4 animals on this card', () => {
    player.addResourceTo(card, 8);
    expect(card.getVictoryPoints(player)).to.eq(6);

    player.addResourceTo(card, 3);
    expect(card.getVictoryPoints(player)).to.eq(8);
  });
});
