import {expect} from 'chai';
import {SpaceHabitat} from '../../../src/server/cards/highOrbit/SpaceHabitat';
import {Tag} from '../../../src/common/cards/Tag';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('SpaceHabitat', () => {
  let card: SpaceHabitat;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new SpaceHabitat();
    [game, player] = testGame(2);
  });

  it('cannot play without more Space tags than Infrastructure tags', () => {
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {[Tag.SPACE]: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act without titanium', () => {
    player.titanium = 0;
    expect(card.canAct(player)).is.false;
  });

  it('spends 1 titanium to increase M€ production 1 step', () => {
    player.titanium = 1;
    expect(card.canAct(player)).is.true;

    card.action(player);
    runAllActions(game);

    expect(player.titanium).to.eq(0);
    expect(player.production.megacredits).to.eq(1);
  });
});
