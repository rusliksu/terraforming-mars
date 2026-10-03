import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {SmallDeposit} from '../../../src/server/cards/idesofmars/SmallDeposit';
import {TestPlayer} from '../../TestPlayer';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {churn, runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('SmallDeposit', () => {
  let card: SmallDeposit;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SmallDeposit();
    [/* game */, player] = testGame(1);
  });

  it('adds 6 ore to the card on play', () => {
    card.play(player);
    runAllActions(player.game);
    expect(card.resourceCount).to.eq(6);
  });

  it('cannot act with fewer than 2 ore on the card', () => {
    card.play(player);
    runAllActions(player.game);
    card.resourceCount = 1;
    expect(card.canAct(player)).is.false;
  });

  it('spends 2 ore to get 2 steel', () => {
    card.play(player);
    runAllActions(player.game);
    const startingSteel = player.steel;

    const orOptions = cast(churn(card.action(player), player), OrOptions);
    orOptions.options[0].cb();

    expect(card.resourceCount).to.eq(4);
    expect(player.steel).to.eq(startingSteel + 2);
  });

  it('spends 2 ore to get 2 titanium', () => {
    card.play(player);
    runAllActions(player.game);
    const startingTitanium = player.titanium;

    const orOptions = cast(churn(card.action(player), player), OrOptions);
    orOptions.options[1].cb();

    expect(card.resourceCount).to.eq(4);
    expect(player.titanium).to.eq(startingTitanium + 2);
  });
});
