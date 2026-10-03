import {expect} from 'chai';
import {GarbageDumps} from '../../../src/server/cards/sillyfication/GarbageDumps';
import {IGame} from '../../../src/server/IGame';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TileType} from '../../../src/common/TileType';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('GarbageDumps', () => {
  let card: GarbageDumps;
  let player: TestPlayer;
  let player2: TestPlayer;
  let player3: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new GarbageDumps();
    [game, player, player2, player3] = testGame(3);
  });

  it('scores -1 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(-1);
  });

  it('every opponent with an adjacent tile loses 1 TR, with no choice prompt', () => {
    card.play(player);
    runAllActions(game);
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);

    // Choose the garbage dump space, then give two opponents a tile next to it.
    const target = selectSpace.spaces[0];
    const landNeighbours = game.board.getAdjacentSpaces(target)
      .filter((s) => s.spaceType !== 'ocean' && s.tile === undefined && s.id !== target.id);
    expect(landNeighbours.length).to.be.greaterThan(1);
    game.addGreenery(player2, landNeighbours[0]);
    game.addGreenery(player3, landNeighbours[1]);
    const tr2 = player2.terraformRating;
    const tr3 = player3.terraformRating;

    selectSpace.cb(target);
    runAllActions(game);

    expect(target.tile?.tileType).to.eq(TileType.GARBAGE_DUMP);
    expect(player.popWaitingFor()).is.undefined;
    expect(player2.terraformRating).to.eq(tr2 - 1);
    expect(player3.terraformRating).to.eq(tr3 - 1);
  });

  it('no TR loss when no other player has an adjacent tile', () => {
    const tr2 = player2.terraformRating;

    card.play(player);
    runAllActions(game);
    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);
    runAllActions(game);

    expect(player.popWaitingFor()).is.undefined;
    expect(player2.terraformRating).to.eq(tr2);
  });
});
