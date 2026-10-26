import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {MicrobeColtures} from '../../../src/server/cards/corporatebetterments/MicrobeColtures';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('MicrobeColtures', () => {
  let card: MicrobeColtures;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new MicrobeColtures();
    [game, player] = testGame(2);
  });

  it('cannot play without 2 Science tags', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 2 Science tags', () => {
    player.tagsForTest = {science: 2};
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act without any heat', () => {
    player.playedCards.push(card);
    player.heat = 0;
    expect(card.canAct(player)).is.false;
  });

  it('spends 1 heat to add 1 microbe to this card', () => {
    player.playedCards.push(card);
    player.heat = 1;
    expect(card.canAct(player)).is.true;

    card.action(player);
    const orOptions = cast(game.deferredActions.pop()!.execute(), OrOptions);
    orOptions.options[0].cb(undefined);
    runAllActions(game);

    expect(player.heat).to.eq(0);
    expect(card.resourceCount).to.eq(1);
  });

  it('spends 5 heat to add 2 microbes to this card', () => {
    player.playedCards.push(card);
    player.heat = 5;

    card.action(player);
    const orOptions = cast(game.deferredActions.pop()!.execute(), OrOptions);
    orOptions.options[1].cb(undefined);
    runAllActions(game);

    expect(player.heat).to.eq(0);
    expect(card.resourceCount).to.eq(2);
  });

  it('awards 1 VP for every 3rd microbe here', () => {
    player.addResourceTo(card, 7);
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
