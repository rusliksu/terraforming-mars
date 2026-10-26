import {expect} from 'chai';
import {SmesTechnology} from '../../../src/server/cards/robantilles/SmesTechnology';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {doWait, forceGenerationEnd, runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {cast} from '../../../src/common/utils/utils';

describe('SmesTechnology', () => {
  let card: SmesTechnology;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new SmesTechnology();
    [game, player] = testGame(2);
  });

  it('cannot play without a Science tag', () => {
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {science: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('lets the player keep up to 3 energy instead of converting all of it to heat', () => {
    cast(player.popWaitingFor(), undefined);
    player.playedCards.push(card);
    player.production.override({energy: 1, heat: 0});
    player.energy = 5;
    player.heat = 0;
    forceGenerationEnd(game);
    runAllActions(game);

    doWait(player, SelectAmount, (selectAmount) => {
      expect(selectAmount.max).eq(3); // capped at 3, even with 5 energy on hand
      selectAmount.cb(3);
    });

    expect(player.energy).eq(4); // 3 kept + 1 from production
    expect(player.heat).eq(2); // the other 2 converted to heat

    // Select cards for next generation
    cast(player.popWaitingFor(), SelectCard);
  });

  it('converts everything to heat when the player chooses to keep none', () => {
    cast(player.popWaitingFor(), undefined);
    player.playedCards.push(card);
    player.production.override({energy: 0, heat: 0});
    player.energy = 5;
    player.heat = 0;
    forceGenerationEnd(game);
    runAllActions(game);

    doWait(player, SelectAmount, (selectAmount) => {
      selectAmount.cb(0);
    });

    expect(player.energy).eq(0);
    expect(player.heat).eq(5);
  });
});
