import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {Infrastructures} from '../../../src/server/cards/idesofmars/Infrastructures';
import {TestPlayer} from '../../TestPlayer';

describe('Infrastructures', () => {
  let card: Infrastructures;
  let player: TestPlayer;

  beforeEach(() => {
    card = new Infrastructures();
    [, player] = testGame(2);
  });

  it('increases M€ production and steel production by 1', () => {
    const megacreditsBefore = player.production.megacredits;
    const steelBefore = player.production.steel;

    card.play(player);

    expect(player.production.megacredits).to.eq(megacreditsBefore + 1);
    expect(player.production.steel).to.eq(steelBefore + 1);
  });
});
