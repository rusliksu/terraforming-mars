import {expect} from 'chai';
import {InSituResourceUtilization} from '../../../src/server/cards/venusPhase2/InSituResourceUtilization';
import {AsteroidMine} from '../../../src/server/cards/highOrbit/AsteroidMine';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';

describe('InSituResourceUtilization', () => {
  let card: InSituResourceUtilization;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new InSituResourceUtilization();
    [game, player] = testGame(2, {venusPhase2Expansion: true, coloniesExtension: true});
    player.playedCards.push(card);
  });

  it('starts a colony trade, then spends 3 ore from any card', () => {
    const asteroidMine = new AsteroidMine();
    asteroidMine.resourceCount = 3;
    player.playedCards.push(asteroidMine);
    player.megaCredits = 20;

    card.action(player);
    runAllActions(game);

    // Trading has a higher priority than the ore spend, so its prompt appears first.
    const tradePrompt = player.popWaitingFor();
    expect(tradePrompt).to.not.be.undefined;
    expect(asteroidMine.resourceCount).to.eq(3);
  });
});
