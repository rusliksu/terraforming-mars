import {expect} from 'chai';
import {SolarSenate} from '../../../src/server/cards/idesofmars/SolarSenate';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {Luna} from '../../../src/server/colonies/Luna';
import {SelectParty} from '../../../src/server/inputs/SelectParty';
import {cast} from '../../../src/common/utils/utils';

describe('SolarSenate', () => {
  let card: SolarSenate;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new SolarSenate();
    [game, player, player2] = testGame(2, {coloniesExtension: true, turmoilExtension: true});
  });

  it('cannot play without an Earth and a Mars tag', () => {
    player.tagsForTest = {earth: 1, mars: 0};
    expect(card.canPlay(player)).is.false;

    player.tagsForTest = {earth: 0, mars: 1};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 1 Earth tag and 1 Mars tag', () => {
    player.tagsForTest = {earth: 1, mars: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('increases M€ production on play', () => {
    card.play(player);
    expect(player.production.megacredits).to.eq(1);
  });

  it('only players who own a colony add a delegate', () => {
    const colony = new Luna();
    colony.colonies.push(player.id);
    game.colonies.push(colony);

    card.play(player);
    runAllActions(game);

    const selectParty = cast(player.popWaitingFor(), SelectParty);
    expect(selectParty).is.not.undefined;
    expect(player2.getWaitingFor()).is.undefined;
  });

  it('does nothing extra when nobody owns a colony', () => {
    card.play(player);
    runAllActions(game);

    expect(player.getWaitingFor()).is.undefined;
    expect(player2.getWaitingFor()).is.undefined;
  });
});
