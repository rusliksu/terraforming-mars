import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {LunarMantleExcavation} from '../../../src/server/cards/corporatebetterments/LunarMantleExcavation';
import {TestPlayer} from '../../TestPlayer';

describe('LunarMantleExcavation', () => {
  let card: LunarMantleExcavation;
  let player: TestPlayer;

  beforeEach(() => {
    card = new LunarMantleExcavation();
    [/* game */, player] = testGame(2);
  });

  it('cannot play without a Moon tag', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play with a Moon tag, and increases energy production', () => {
    player.tagsForTest = {moon: 1};
    expect(card.canPlay(player)).is.true;

    card.play(player);
    expect(player.production.energy).to.eq(1);
  });

  it('cannot act without energy', () => {
    card.play(player);
    expect(card.canAct(player)).is.not.true;
  });

  it('acts: spends energy for the same amount of steel', () => {
    card.play(player);
    player.energy = 3;

    expect(card.canAct(player)).is.true;
    const action = card.action(player);
    action.cb(3);

    expect(player.energy).to.eq(0);
    expect(player.steel).to.eq(3);
  });
});
