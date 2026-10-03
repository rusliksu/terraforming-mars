import {expect} from 'chai';
import {UpgradedSaws} from '../../../src/server/cards/robantilles/UpgradedSaws';
import {testGame} from '../../TestGame';
import {addGreenery} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';

describe('UpgradedSaws', () => {
  let card: UpgradedSaws;
  let player: TestPlayer;
  let opponent: TestPlayer;

  beforeEach(() => {
    card = new UpgradedSaws();
    [/* game */, player, opponent] = testGame(2);
    player.playedCards.push(card);
  });

  it('increases M€ production when the owner places a greenery', () => {
    expect(player.production.megacredits).to.eq(0);
    addGreenery(player);
    expect(player.production.megacredits).to.eq(1);
  });

  it('does not trigger when an opponent places a greenery', () => {
    addGreenery(opponent);
    expect(player.production.megacredits).to.eq(0);
  });
});
