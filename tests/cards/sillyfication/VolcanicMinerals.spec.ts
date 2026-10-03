import {expect} from 'chai';
import {VolcanicMinerals} from '../../../src/server/cards/sillyfication/VolcanicMinerals';
import {IGame} from '../../../src/server/IGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('VolcanicMinerals', () => {
  let card: VolcanicMinerals;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new VolcanicMinerals();
    [game, player] = testGame(2);
    player.megaCredits = card.cost;
    player.cardsInHand = [card];
  });

  it('cannot play without 4 heat', () => {
    player.heat = 3;
    expect(player.canPlay(card)).is.false;
    player.heat = 4;
    expect(player.canPlay(card)).is.true;
  });

  it('offers the choice exactly once and gains 4 titanium', () => {
    player.heat = 5;
    card.play(player);
    runAllActions(game);

    const options = cast(player.popWaitingFor(), OrOptions);
    expect(options.options).has.lengthOf(2);
    options.options[0].cb();
    runAllActions(game);

    // No second choice queued.
    expect(player.popWaitingFor()).is.undefined;
    expect(player.heat).to.eq(1);
    expect(player.titanium).to.eq(4);
    expect(player.steel).to.eq(0);
  });

  it('spends 4 heat and gains 6 steel', () => {
    player.heat = 4;
    card.play(player);
    runAllActions(game);

    const options = cast(player.popWaitingFor(), OrOptions);
    options.options[1].cb();
    runAllActions(game);

    expect(player.heat).to.eq(0);
    expect(player.steel).to.eq(6);
    expect(player.titanium).to.eq(0);
  });
});
