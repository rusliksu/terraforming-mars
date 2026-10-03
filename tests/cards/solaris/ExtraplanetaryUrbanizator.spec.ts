import {expect} from 'chai';
import {ExtraplanetaryUrbanizator} from '../../../src/server/cards/solaris/ExtraplanetaryUrbanizator';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('ExtraplanetaryUrbanizator', () => {
  let card: ExtraplanetaryUrbanizator;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new ExtraplanetaryUrbanizator();
    [game, player] = testGame(1);
  });

  it('cannot play with a terraform rating below 40', () => {
    player.setTerraformRating(39);
    expect(card.canPlay(player)).is.false;
  });

  it('can play with a terraform rating of 40 or more', () => {
    player.setTerraformRating(40);
    expect(card.canPlay(player)).is.true;
  });

  it('places a city and increases M€ production on action', () => {
    const citiesBefore = game.board.getCities().length;
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);

    expect(game.board.getCities()).has.lengthOf(citiesBefore + 1);
    expect(player.production.megacredits).to.eq(1);
  });

  it('scores 3 VP per Galactic tag owned, including this', () => {
    player.tagsForTest = {galactic: 0};
    expect(card.getVictoryPoints(player)).eq(3);
  });
});
