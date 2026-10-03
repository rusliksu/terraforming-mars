import {expect} from 'chai';
import {cast} from '../../../src/common/utils/utils';
import {AirTransportCompany} from '../../../src/server/cards/idesofmars/AirTransportCompany';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {FloatingHabs} from '../../../src/server/cards/venusNext/FloatingHabs';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {runAllActions} from '../../TestingUtils';

describe('AirTransportCompany', () => {
  let card: AirTransportCompany;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new AirTransportCompany();
    [game, player] = testGame(1, {venusNextExtension: true});
  });

  it('cannot play without 2 Venus tags', () => {
    player.tagsForTest = {venus: 1};
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {venus: 2};
    expect(card.canPlay(player)).is.true;
  });

  it('adds 2 floaters to the only eligible card on play', () => {
    player.tagsForTest = {venus: 2};
    const dirigibles = new Dirigibles();
    player.playedCards.push(dirigibles);

    card.play(player);
    runAllActions(game);
    expect(dirigibles.resourceCount).eq(2);
  });

  it('does nothing for the move step when no card has floaters', () => {
    expect(card.bespokePlay(player)).is.undefined;
  });

  it('moves up to 4 floaters from one card to another of yours', () => {
    const dirigibles = new Dirigibles();
    const floatingHabs = new FloatingHabs();
    player.playedCards.push(dirigibles, floatingHabs);
    dirigibles.resourceCount = 5;

    const selectSource = cast(card.bespokePlay(player), SelectCard);
    expect(selectSource.cards).deep.eq([dirigibles]);

    const selectAmount = cast(selectSource.cb([dirigibles]), SelectAmount);
    expect(selectAmount.min).eq(0);
    expect(selectAmount.max).eq(4);

    const selectDestination = cast(selectAmount.cb(3), SelectCard);
    expect(selectDestination.cards).deep.eq([floatingHabs]);

    selectDestination.cb([floatingHabs]);
    expect(dirigibles.resourceCount).eq(2);
    expect(floatingHabs.resourceCount).eq(3);
  });

  it('does not offer a destination when there is only one floater card', () => {
    const dirigibles = new Dirigibles();
    player.playedCards.push(dirigibles);
    dirigibles.resourceCount = 3;

    const selectSource = cast(card.bespokePlay(player), SelectCard);
    const selectAmount = cast(selectSource.cb([dirigibles]), SelectAmount);
    expect(selectAmount.cb(2)).is.undefined;
    expect(dirigibles.resourceCount).eq(3);
  });

  it('scores a flat 1 VP', () => {
    expect(card.getVictoryPoints(player)).eq(1);
  });
});
