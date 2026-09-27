import {expect} from 'chai';
import {SpaceTradingStation} from '../../../src/server/cards/highOrbit/SpaceTradingStation';
import {Tag} from '../../../src/common/cards/Tag';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {churn, runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('SpaceTradingStation', () => {
  let card: SpaceTradingStation;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new SpaceTradingStation();
    [game, player] = testGame(2);
  });

  it('cannot play without more Space tags than Infrastructure tags', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play once Space tags outnumber Infrastructure tags', () => {
    player.tagsForTest = {[Tag.SPACE]: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('can spend titanium for M€ (only option available auto-executes)', () => {
    player.titanium = 2;

    card.action(player);
    runAllActions(game);

    expect(player.titanium).to.eq(0);
    expect(player.megaCredits).to.eq(7);
  });

  it('can spend M€ for titanium (only option available auto-executes)', () => {
    player.megaCredits = 5;

    card.action(player);
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(player.titanium).to.eq(2);
  });

  it('offers both options when both are affordable', () => {
    player.titanium = 2;
    player.megaCredits = 5;

    const orOptions = cast(churn(card.action(player), player), OrOptions);
    expect(orOptions.options).has.lengthOf(2);

    orOptions.options[0].cb(undefined);
    expect(player.titanium).to.eq(0);
    expect(player.megaCredits).to.eq(12);
  });
});
