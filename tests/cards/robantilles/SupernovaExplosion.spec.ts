import {expect} from 'chai';
import {SupernovaExplosion} from '../../../src/server/cards/robantilles/SupernovaExplosion';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('SupernovaExplosion', () => {
  let card: SupernovaExplosion;
  let game: IGame;
  let player: TestPlayer;
  let opponent: TestPlayer;

  beforeEach(() => {
    card = new SupernovaExplosion();
    [game, player, opponent] = testGame(2);
  });

  it('raises temperature, gains energy and heat, and can remove plants from any player', () => {
    opponent.plants = 6;

    card.play(player);
    runAllActions(game);

    expect(game.getTemperature()).eq(-28);
    expect(player.energy).eq(5);
    expect(player.heat).eq(5);

    const orOptions = cast(player.getWaitingFor(), OrOptions);
    orOptions.options[0].cb(); // remove plants
    expect(opponent.plants).eq(2);
  });
});
