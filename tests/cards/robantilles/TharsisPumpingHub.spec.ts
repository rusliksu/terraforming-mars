import {expect} from 'chai';
import {TharsisPumpingHub} from '../../../src/server/cards/robantilles/TharsisPumpingHub';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {churn, doWait, forceGenerationEnd, maxOutOceans, runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {cast} from '../../../src/common/utils/utils';

describe('TharsisPumpingHub', () => {
  let card: TharsisPumpingHub;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new TharsisPumpingHub();
    [game, player] = testGame(2);
  });

  it('cannot play without 3 ocean tiles', () => {
    expect(card.canPlay(player)).is.not.true;
  });

  it('places the tile adjacent to an ocean and increases energy production', () => {
    maxOutOceans(player, 3);

    cast(churn(card.play(player), player), SelectSpace);

    expect(player.production.energy).eq(1);
  });

  it('lets the player keep up to 4 energy instead of converting all of it to heat', () => {
    cast(player.popWaitingFor(), undefined);
    player.playedCards.push(card);
    player.production.override({energy: 0, heat: 0});
    player.energy = 6;
    player.heat = 0;
    forceGenerationEnd(game);
    runAllActions(game);

    doWait(player, SelectAmount, (selectAmount) => {
      expect(selectAmount.max).eq(4); // capped at 4, even with 6 energy on hand
      selectAmount.cb(4);
    });

    expect(player.energy).eq(4);
    expect(player.heat).eq(2);

    // Select cards for next generation
    cast(player.popWaitingFor(), SelectCard);
  });
});
