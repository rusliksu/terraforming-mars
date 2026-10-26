import {expect} from 'chai';
import {DebrisField} from '../../../src/server/cards/sillyfication/DebrisField';
import {IGame} from '../../../src/server/IGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('DebrisField', () => {
  let card: DebrisField;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new DebrisField();
    [game, player, player2] = testGame(2);
  });

  it('gains 1 titanium and 1 steel and can remove up to 3 plants', () => {
    player.titanium = 0;
    player.steel = 0;
    player2.plants = 5;

    card.play(player);
    runAllActions(game);

    expect(player.titanium).to.eq(1);
    expect(player.steel).to.eq(1);

    const orOptions = cast(player.getWaitingFor(), OrOptions);
    orOptions.options[0].cb();
    expect(player2.plants).to.eq(2);
  });
});
