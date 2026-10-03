import {expect} from 'chai';
import {ComputationalBiology} from '../../../src/server/cards/venusPhase2/ComputationalBiology';
import {Ants} from '../../../src/server/cards/base/Ants';
import {Probe} from '../../../src/server/cards/highOrbit/Probe';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {runAllActions} from '../../TestingUtils';

describe('ComputationalBiology', () => {
  let card: ComputationalBiology;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ComputationalBiology();
    [game, player] = testGame(2);
  });

  it('adds 2 microbes to any card and 2 data to any card', () => {
    const ants = new Ants();
    const probe = new Probe();
    player.playedCards.push(ants, probe);
    card.play(player);
    runAllActions(game);
    expect(ants.resourceCount).to.eq(2);
    expect(probe.resourceCount).to.eq(2);
  });
});
