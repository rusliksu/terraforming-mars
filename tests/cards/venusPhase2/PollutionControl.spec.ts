import {expect} from 'chai';
import {PollutionControl} from '../../../src/server/cards/venusPhase2/PollutionControl';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('PollutionControl', () => {
  let card: PollutionControl;
  let player: TestPlayer;

  beforeEach(() => {
    card = new PollutionControl();
    [/* game */, player] = testGame(2);
  });

  it('decreases M€ production 2 steps and increases TR 2 steps', () => {
    player.production.override({megacredits: 2});
    const trBefore = player.terraformRating;
    card.play(player);
    expect(player.production.megacredits).to.eq(0);
    expect(player.terraformRating).to.eq(trBefore + 2);
  });
});
