import {expect} from 'chai';
import {Hydroponics} from '../../../src/server/cards/highOrbit/Hydroponics';
import {Tag} from '../../../src/common/cards/Tag';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('Hydroponics', () => {
  let card: Hydroponics;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Hydroponics();
    [game, player] = testGame(2);
  });

  it('cannot play without more Space tags than Infrastructure tags', () => {
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {[Tag.SPACE]: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act without energy', () => {
    player.energy = 0;
    expect(card.canAct(player)).is.false;
  });

  it('spends 1 energy to gain 2 plants', () => {
    player.energy = 1;
    player.plants = 0;
    expect(card.canAct(player)).is.true;

    card.action(player);
    runAllActions(game);

    expect(player.energy).to.eq(0);
    expect(player.plants).to.eq(2);
  });
});
