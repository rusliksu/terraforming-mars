import {expect} from 'chai';
import {HumpbackWhales} from '../../../src/server/cards/robantilles/HumpbackWhales';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {maxOutOceans} from '../../TestingUtils';

describe('HumpbackWhales', () => {
  let card: HumpbackWhales;
  let player: TestPlayer;

  beforeEach(() => {
    card = new HumpbackWhales();
    [, player] = testGame(1);
  });

  it('cannot play with fewer than 8 oceans in play', () => {
    maxOutOceans(player, 7);
    expect(card.canPlay(player)).is.false;
  });

  it('can play with at least 8 oceans in play', () => {
    maxOutOceans(player, 8);
    expect(card.canPlay(player)).is.true;
  });

  it('is worth a flat 3 victory points', () => {
    expect(card.getVictoryPoints(player)).to.eq(3);
  });
});
