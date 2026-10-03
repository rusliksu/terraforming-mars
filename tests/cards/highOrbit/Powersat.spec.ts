import {expect} from 'chai';
import {Powersat} from '../../../src/server/cards/highOrbit/Powersat';
import {Tag} from '../../../src/common/cards/Tag';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('Powersat', () => {
  let card: Powersat;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Powersat();
    [game, player] = testGame(2);
  });

  it('cannot play without more Space tags than Infrastructure tags', () => {
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {[Tag.SPACE]: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act without 2 titanium', () => {
    player.titanium = 1;
    expect(card.canAct(player)).is.false;
  });

  it('spends 2 titanium to increase energy production 1 step', () => {
    player.titanium = 2;
    expect(card.canAct(player)).is.true;

    card.action(player);
    runAllActions(game);

    expect(player.titanium).to.eq(0);
    expect(player.production.energy).to.eq(1);
  });
});
