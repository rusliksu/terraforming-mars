import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {maxOutOceans, runAllActions} from '../../TestingUtils';
import {NaturalGrowthCatalyst} from '../../../src/server/cards/idesofmars/NaturalGrowthCatalyst';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';

describe('NaturalGrowthCatalyst', () => {
  let card: NaturalGrowthCatalyst;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new NaturalGrowthCatalyst();
    [game, player] = testGame(2);
  });

  it('cannot play with fewer than 8 oceans', () => {
    maxOutOceans(player, 7);
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 8 oceans', () => {
    maxOutOceans(player, 8);
    expect(card.canPlay(player)).is.true;
  });

  it('places 2 greenery tiles, raising oxygen along the way', () => {
    maxOutOceans(player, 8);
    const oxygenBefore = game.getOxygenLevel();

    card.play(player);

    for (let i = 0; i < 2; i++) {
      const selectSpace = cast(game.deferredActions.pop()?.execute(), SelectSpace);
      selectSpace.cb(selectSpace.spaces[0]);
    }
    runAllActions(game);

    expect(game.board.getGreeneries(player)).has.lengthOf(2);
    expect(game.getOxygenLevel()).to.eq(Math.min(14, oxygenBefore + 2));
  });
});
