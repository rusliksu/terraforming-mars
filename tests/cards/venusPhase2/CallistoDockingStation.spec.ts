import {expect} from 'chai';
import {CallistoDockingStation} from '../../../src/server/cards/venusPhase2/CallistoDockingStation';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('CallistoDockingStation', () => {
  let card: CallistoDockingStation;
  let player: TestPlayer;

  beforeEach(() => {
    card = new CallistoDockingStation();
    [/* game */, player] = testGame(2);
  });

  it('increases M€ and titanium production 1 step each', () => {
    card.play(player);
    expect(player.production.megacredits).to.eq(1);
    expect(player.production.titanium).to.eq(1);
  });

  it('is worth 1 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
