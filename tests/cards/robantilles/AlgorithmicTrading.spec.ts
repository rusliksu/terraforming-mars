import {expect} from 'chai';
import {AlgorithmicTrading} from '../../../src/server/cards/robantilles/AlgorithmicTrading';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('AlgorithmicTrading', () => {
  let card: AlgorithmicTrading;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new AlgorithmicTrading();
    [game, player] = testGame(1);
  });

  it('cannot play without a Science tag', () => {
    player.tagsForTest = {};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with a Science tag', () => {
    player.tagsForTest = {science: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('increases M€ production 1 step on play', () => {
    player.tagsForTest = {science: 1};
    card.play(player);
    expect(player.production.megacredits).to.eq(1);
  });

  it('action spends 8 M€ to increase M€ production 2 steps', () => {
    player.megaCredits = 8;
    expect(card.canAct(player)).is.true;

    card.action(player);
    game.deferredActions.runNext();

    expect(player.megaCredits).to.eq(0);
    expect(player.production.megacredits).to.eq(2);
  });

  it('cannot act without enough M€', () => {
    player.megaCredits = 7;
    expect(card.canAct(player)).is.false;
  });
});
