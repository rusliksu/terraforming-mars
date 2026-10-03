import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {GreatFaceOfCydonia} from '../../../src/server/cards/robantilles/GreatFaceOfCydonia';
import {finishGeneration} from '../../TestingUtils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {IGame} from '../../../src/server/IGame';
import {cast} from '../../../src/common/utils/utils';

describe('GreatFaceOfCydonia', () => {
  let card: GreatFaceOfCydonia;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new GreatFaceOfCydonia();
    [game, player] = testGame(1, {turmoilExtension: false});
  });

  it('cannot play without 3 Science tags', () => {
    expect(card.canPlay(player)).is.false;

    player.tagsForTest = {science: 2};
    expect(card.canPlay(player)).is.false;

    player.tagsForTest = {science: 3};
    expect(card.canPlay(player)).is.true;
  });

  it('draws 1 extra card during the research phase', () => {
    player.playedCards.push(card);
    game.generation = 2;

    finishGeneration(game);

    const selectCard = cast(player.popWaitingFor(), SelectCard);
    expect(selectCard.cards).has.length(5);
  });

  it('may keep 2 cards in the first round of the draft variant', () => {
    const [draftGame, draftPlayer] = testGame(2, {draftVariant: true, turmoilExtension: false});
    draftPlayer.playedCards.push(card);
    draftGame.generation = 2;

    finishGeneration(draftGame);

    const selectCard = cast(draftPlayer.popWaitingFor(), SelectCard);
    expect(selectCard.cards).has.length(5);
    expect(selectCard.config.min).eq(2);
    expect(selectCard.config.max).eq(2);
  });
});
