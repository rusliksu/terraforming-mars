import {expect} from 'chai';
import {cast} from '../../../src/common/utils/utils';
import {GreatLeapForward} from '../../../src/server/cards/idesofmars/GreatLeapForward';
import {IGame} from '../../../src/server/IGame';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setOxygenLevel, setTemperature} from '../../TestingUtils';

describe('GreatLeapForward', () => {
  let card: GreatLeapForward;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new GreatLeapForward();
    [game, player] = testGame(2, {turmoilExtension: true});
  });

  it('cannot play unless you are the Chairman', () => {
    expect(card.canPlay(player)).is.false;
    game.turmoil!.chairman = player;
    expect(card.canPlay(player)).is.true;
  });

  it('raises temperature and oxygen 1 step and places an ocean', () => {
    game.turmoil!.chairman = player;
    setTemperature(game, -2);
    setOxygenLevel(game, 0);

    card.play(player);

    expect(game.getTemperature()).eq(0);
    expect(game.getOxygenLevel()).eq(1);

    const selectSpace = cast(game.deferredActions.pop()!.execute(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);
    expect(game.board.getOceanSpaces()).has.length(1);
  });
});
