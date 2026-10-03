import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {Stellatron} from '../../../src/server/cards/solaris/Stellatron';
import {setVenusScaleLevel} from '../../TestingUtils';

describe('Stellatron', () => {
  let card: Stellatron;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Stellatron();
    [game, player] = testGame(2, {venusNextExtension: true});
    player.megaCredits = card.cost;
  });

  it('cannot play with fewer than 5 Venus tags', () => {
    player.tagsForTest = {venus: 4};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 5 Venus tags', () => {
    player.tagsForTest = {venus: 5};
    expect(card.canPlay(player)).is.true;
  });

  it('acting at max Venus does not raise it further', () => {
    setVenusScaleLevel(game, 30);
    player.playedCards.push(card);

    card.action(player);
    expect(game.getVenusScaleLevel()).to.eq(30);
  });

  it('action raises Venus 1 step', () => {
    setVenusScaleLevel(game, 10);
    player.playedCards.push(card);

    card.action(player);
    expect(game.getVenusScaleLevel()).to.eq(12);
  });

  it('victoryPoints counts its own Galactic tag', () => {
    player.playedCards.push(card);
    expect(card.getVictoryPoints(player)).to.eq(3);
  });
});
