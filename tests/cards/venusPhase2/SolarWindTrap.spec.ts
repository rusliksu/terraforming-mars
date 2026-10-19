import {expect} from 'chai';
import {SolarWindTrap} from '../../../src/server/cards/venusPhase2/SolarWindTrap';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast} from '../../../src/common/utils/utils';

describe('SolarWindTrap', () => {
  let card: SolarWindTrap;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SolarWindTrap();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
    player.playedCards.push(card);
  });

  it('auto-selects adding 2 ore to this card when it has fewer than 3 ore', () => {
    card.action(player);
    runAllActions(game);
    expect(card.resourceCount).to.eq(2);
  });

  it('prompts a choice once there are 3 or more ore, and can raise Venus 1 step', () => {
    card.resourceCount = 3;
    const venusBefore = game.getVenusScaleLevel();

    card.action(player);
    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    options.options[1].cb();
    runAllActions(game);

    expect(card.resourceCount).to.eq(0);
    expect(game.getVenusScaleLevel()).to.eq(venusBefore + 2);
  });
});
