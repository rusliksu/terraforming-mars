import {expect} from 'chai';
import {GuerrillaGardening} from '../../../src/server/cards/sillyfication/GuerrillaGardening';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TileType} from '../../../src/common/TileType';

describe('GuerrillaGardening', () => {
  let card: GuerrillaGardening;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new GuerrillaGardening();
    [game, player] = testGame(2);
  });

  it('requires 7% oxygen', () => {
    (game as any).oxygenLevel = 6;
    expect(card.canPlay(player)).is.false;
    (game as any).oxygenLevel = 7;
    expect(card.canPlay(player)).is.true;
  });

  it('places 2 greeneries, raising oxygen and TR each time', () => {
    // Start above the 8% temperature-bonus threshold so each greenery is a clean +1 TR.
    (game as any).oxygenLevel = 10;
    const trBefore = player.terraformRating;

    card.play(player);

    const first = cast(game.deferredActions.pop()!.execute(), SelectSpace);
    first.cb(first.spaces[0]);
    const second = cast(game.deferredActions.pop()!.execute(), SelectSpace);
    second.cb(second.spaces[0]);
    runAllActions(game);

    const greeneries = game.board.spaces.filter((s) => s.tile?.tileType === TileType.GREENERY && s.player === player);
    expect(greeneries).has.lengthOf(2);
    expect(game.getOxygenLevel()).to.eq(12);
    expect(player.terraformRating).to.eq(trBefore + 2);
  });
});
