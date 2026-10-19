import {expect} from 'chai';
import {DragonStorm} from '../../../src/server/cards/idesofmars/DragonStorm';
import {Tag} from '../../../src/common/cards/Tag';
import {CardType} from '../../../src/common/cards/CardType';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('DragonStorm', () => {
  let card: DragonStorm;
  let player: TestPlayer;

  beforeEach(() => {
    card = new DragonStorm();
    [, player] = testGame(1);
  });

  it('has the printed stats', () => {
    expect(card.type).to.eq(CardType.ACTIVE);
    expect(card.tags).deep.eq([Tag.POWER, Tag.JOVIAN]);
    expect(card.cost).to.eq(24);
    expect(card.victoryPoints).to.eq(1);
  });

  it('can act only with energy available', () => {
    player.energy = 0;
    expect(card.canAct(player)).is.false;

    player.energy = 1;
    expect(card.canAct(player)).is.true;
  });

  it('action spends 1 energy to gain 1 energy production', () => {
    player.energy = 1;
    const before = player.production.energy;

    card.action(player);

    expect(player.energy).to.eq(0);
    expect(player.production.energy).to.eq(before + 1);
  });
});
