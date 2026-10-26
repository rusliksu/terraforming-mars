import {expect} from 'chai';
import {testGame} from '../TestGame';
import {TestPlayer} from '../TestPlayer';
import {IGame} from '../../src/server/IGame';
import {TileType} from '../../src/common/TileType';
import {SpaceBonus} from '../../src/common/boards/SpaceBonus';
import {MarsBoard} from '../../src/server/boards/MarsBoard';
import {MiningArea} from '../../src/server/cards/base/MiningArea';
import {ArcadianCommunities} from '../../src/server/cards/promo/ArcadianCommunities';
import {KingdomofTauraro} from '../../src/server/cards/underworld/KingdomofTauraro';
import {Space} from '../../src/server/boards/Space';

describe('Conglomerates tile-placement adjacency', () => {
  let game: IGame;
  let board: MarsBoard;
  let player1: TestPlayer;
  let player2: TestPlayer;
  let player3: TestPlayer;
  // A space with a free neighbor, chosen so setting that neighbor's owner is the only thing
  // that changes whether `contestedSpace` is offered.
  let contestedSpace: Space;
  let contestedNeighbor: Space;

  beforeEach(() => {
    // player1 & player3 are a team; player2 is on the other team.
    [game, player1, player2, player3] = testGame(4, {conglomeratesExpansion: true});
    board = game.board;

    // Give player1 an unrelated owned tile far away, so "place anywhere" (the fallback for
    // when a player owns nothing yet) doesn't mask the adjacency filter under test.
    const farSpace = board.getAvailableSpacesOnLand(player1)[0];
    farSpace.player = player1;
    farSpace.tile = {tileType: TileType.GREENERY};

    // Not adjacent to farSpace, so farSpace alone can't make contestedSpace available.
    contestedSpace = board.getAvailableSpacesOnLand(player1).find((space) =>
      space.id !== farSpace.id && board.getAdjacentSpaces(space).every((adj) => adj.id !== farSpace.id))!;
    contestedNeighbor = board.getAdjacentSpaces(contestedSpace).find((space) =>
      space.tile === undefined && space.id !== farSpace.id)!;
  });

  it('greenery: a teammate\'s tile satisfies the adjacency requirement, an opponent\'s does not', () => {
    contestedNeighbor.player = player3; // teammate
    contestedNeighbor.tile = {tileType: TileType.GREENERY};
    expect(board.getAvailableSpacesForGreenery(player1)).to.include(contestedSpace);

    contestedNeighbor.player = player2; // opponent instead
    expect(board.getAvailableSpacesForGreenery(player1)).to.not.include(contestedSpace);
  });

  it('Kingdom of Tauraro: a teammate\'s tile satisfies the "place next to your tiles" preference', () => {
    player1.playedCards.push(new KingdomofTauraro());

    contestedNeighbor.player = player3;
    contestedNeighbor.tile = {tileType: TileType.GREENERY};
    expect(board.getAvailableSpacesForCity(player1)).to.include(contestedSpace);

    contestedNeighbor.player = player2;
    expect(board.getAvailableSpacesForCity(player1)).to.not.include(contestedSpace);
  });

  it('Mining Area: a teammate\'s tile satisfies the "adjacent to one of your tiles" requirement', () => {
    const card = new MiningArea();
    contestedSpace.bonus = [SpaceBonus.STEEL];
    const getAvailableSpaces = (card as unknown as {getAvailableSpaces: (p: TestPlayer, o: object) => ReadonlyArray<Space>}).getAvailableSpaces;

    contestedNeighbor.player = player3;
    contestedNeighbor.tile = {tileType: TileType.GREENERY};
    expect(getAvailableSpaces.call(card, player1, {})).to.include(contestedSpace);

    contestedNeighbor.player = player2;
    expect(getAvailableSpaces.call(card, player1, {})).to.not.include(contestedSpace);
  });

  it('Arcadian Communities: a teammate\'s tile satisfies the marker-placement requirement', () => {
    const card = new ArcadianCommunities();

    contestedNeighbor.player = player3;
    contestedNeighbor.tile = {tileType: TileType.GREENERY};
    expect(card.getAvailableSpacesForMarker(player1)).to.include(contestedSpace);

    contestedNeighbor.player = player2;
    expect(card.getAvailableSpacesForMarker(player1)).to.not.include(contestedSpace);
  });
});
