import {expect} from 'chai';
import {VenusTradeship} from '../../../src/server/cards/venusPhase2/VenusTradeship';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {AerialMappers} from '../../../src/server/cards/venusNext/AerialMappers';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast} from '../../../src/common/utils/utils';

describe('VenusTradeship', () => {
  let card: VenusTradeship;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new VenusTradeship();
    [game, player] = testGame(2);
  });

  it('cannot play without an eligible card or without at least 2 M€', () => {
    expect(card.canPlay(player)).is.false;

    const dirigibles = new Dirigibles();
    player.playedCards.push(dirigibles);
    expect(card.canPlay(player)).is.false;

    player.megaCredits = 2;
    expect(card.canPlay(player)).is.true;
  });

  it('spends 2 M€ per chosen card and adds 1 floater to each', () => {
    const dirigibles = new Dirigibles();
    const secondFloaterCard = new AerialMappers();
    player.playedCards.push(dirigibles, secondFloaterCard);
    player.megaCredits = 4;

    card.play(player);
    runAllActions(game);

    const selectAmount = cast(player.popWaitingFor(), SelectAmount);
    expect(selectAmount.max).to.eq(2);
    selectAmount.cb(2);
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);

    const selectCard = cast(player.popWaitingFor(), SelectCard);
    selectCard.cb([dirigibles, secondFloaterCard]);

    expect(dirigibles.resourceCount).to.eq(1);
    expect(secondFloaterCard.resourceCount).to.eq(1);
  });
});
