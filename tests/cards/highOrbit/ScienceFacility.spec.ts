import {expect} from 'chai';
import {ScienceFacility} from '../../../src/server/cards/highOrbit/ScienceFacility';
import {Tag} from '../../../src/common/cards/Tag';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {fakeCard, runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('ScienceFacility', () => {
  let card: ScienceFacility;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new ScienceFacility();
    [game, player] = testGame(2);
  });

  it('cannot play without more Space tags than Infrastructure tags', () => {
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {[Tag.SPACE]: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act with nothing to spend', () => {
    player.energy = 0;
    player.titanium = 0;
    card.resourceCount = 0;
    expect(card.canAct(player)).is.false;
  });

  it('spends 1 energy and 1 titanium to add 1 science resource', () => {
    player.energy = 1;
    player.titanium = 1;
    card.resourceCount = 0;
    expect(card.canAct(player)).is.true;

    card.action(player);
    runAllActions(game);

    expect(player.energy).to.eq(0);
    expect(player.titanium).to.eq(0);
    expect(card.resourceCount).to.eq(1);
  });

  it('spends 1 science resource to look at the top 4 cards and keep 1', () => {
    player.energy = 0;
    player.titanium = 0;
    card.resourceCount = 1;
    const top4 = [fakeCard(), fakeCard(), fakeCard(), fakeCard()];
    game.projectDeck.drawPile.push(...[...top4].reverse());
    player.cardsInHand = [];

    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);

    const selectCard = cast(player.popWaitingFor(), SelectCard);
    expect(selectCard.cards).deep.eq(top4);
    selectCard.cb([top4[0]]);
    runAllActions(game);

    expect(card.resourceCount).to.eq(0);
    expect(player.cardsInHand).deep.eq([top4[0]]);
    expect(game.projectDeck.discardPile).has.lengthOf(3);
  });

  it('offers both options when both are available', () => {
    player.energy = 1;
    player.titanium = 1;
    card.resourceCount = 1;
    game.projectDeck.drawPile.push(fakeCard(), fakeCard(), fakeCard(), fakeCard());

    const orOptions = card.action(player) as OrOptions;
    expect(orOptions).instanceOf(OrOptions);
    expect(orOptions.options).has.lengthOf(2);
  });
});
