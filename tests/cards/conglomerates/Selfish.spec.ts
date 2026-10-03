import {expect} from 'chai';
import {Selfish} from '../../../src/server/cards/conglomerates/Selfish';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';

describe('Selfish', () => {
  let card: Selfish;
  let player: TestPlayer;

  beforeEach(() => {
    card = new Selfish();
    [, player] = testGame(4, {conglomeratesExpansion: true});
    player.megaCredits = 10;
  });

  it('cannot play without 1 Coordination', () => {
    player.conglomeratesData.coordination = 0;
    expect(card.canPlay(player)).is.false;
  });

  it('cannot play without enough MC', () => {
    player.conglomeratesData.coordination = 1;
    player.megaCredits = 9;
    expect(player.canPlay(card)).is.false;
  });

  it('spends 1 Coordination and increases MC production 4 steps', () => {
    player.conglomeratesData.coordination = 1;
    const productionBefore = player.production.megacredits;
    expect(card.canPlay(player)).is.true;

    card.play(player);

    expect(player.conglomeratesData.coordination).to.eq(0);
    expect(player.production.megacredits).to.eq(productionBefore + 4);
  });
});
