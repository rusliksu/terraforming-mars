import {expect} from 'chai';
import {InterplanetaryRoutes} from '../../../src/server/cards/venusPhase2/InterplanetaryRoutes';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';

describe('InterplanetaryRoutes', () => {
  let card: InterplanetaryRoutes;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new InterplanetaryRoutes();
    [game, player] = testGame(2, {coloniesExtension: true});
  });

  it('cannot play without an owned colony', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('increases the colony marker on every colony tile where the player has at least 1 colony', () => {
    const colony = game.colonies[0];
    colony.addColony(player);
    const trackBefore = colony.trackPosition;

    expect(card.canPlay(player)).is.true;
    card.play(player);
    expect(colony.trackPosition).to.eq(trackBefore + 1);
  });
});
