import {expect} from 'chai';
import {IGame} from '../../src/server/IGame';
import {TestPlayer} from '../TestPlayer';
import {testGame} from '../TestGame';
import {setVenusScaleLevel} from '../TestingUtils';
import {GrantVenusAltTrackBonusDeferred} from '../../src/server/venusNext/GrantVenusAltTrackBonusDeferred';
import {cast} from '@/common/utils/utils';

describe('Venus Phase 2 extended track', () => {
  let game: IGame;
  let player: TestPlayer;

  it('doubles the track\'s max to 60, keeping the official step of 2', () => {
    [game, player] = testGame(1, {venusPhase2Expansion: true});
    expect(game.parameters.venus.max).to.eq(60);
    expect(game.parameters.venus.step).to.eq(2);
    setVenusScaleLevel(game, 10);
    game.increaseVenusScaleLevel(player, 1);
    expect(game.getVenusScaleLevel()).to.eq(12);
  });

  it('without Venus Phase 2, the track still stops at the official 30', () => {
    [game, player] = testGame(1, {});
    expect(game.parameters.venus.max).to.eq(30);
    setVenusScaleLevel(game, 28);
    game.increaseVenusScaleLevel(player, 2);
    expect(game.getVenusScaleLevel()).to.eq(30);
    // Can't go past the official max without Venus Phase 2.
    game.increaseVenusScaleLevel(player, 1);
    expect(game.getVenusScaleLevel()).to.eq(30);
  });

  it('can raise past the official 30 up to the extended 60', () => {
    [game, player] = testGame(1, {venusPhase2Expansion: true});
    setVenusScaleLevel(game, 28);
    game.increaseVenusScaleLevel(player, 1);
    expect(game.getVenusScaleLevel()).to.eq(30);
    game.increaseVenusScaleLevel(player, 1);
    expect(game.getVenusScaleLevel()).to.eq(32);
    setVenusScaleLevel(game, 58);
    game.increaseVenusScaleLevel(player, 1);
    expect(game.getVenusScaleLevel()).to.eq(60);
    // Can't go past the extended max either.
    game.increaseVenusScaleLevel(player, 1);
    expect(game.getVenusScaleLevel()).to.eq(60);
  });

  it('the draw-a-card bonus at 8 still fires at the same absolute value', () => {
    [game, player] = testGame(1, {venusPhase2Expansion: true});
    setVenusScaleLevel(game, 6);
    player.cardsInHand = [];
    game.increaseVenusScaleLevel(player, 1);
    expect(game.getVenusScaleLevel()).to.eq(8);
    expect(player.cardsInHand).has.length(1);
  });

  it('the TR bonus at 16 still fires at the same absolute value', () => {
    [game, player] = testGame(1, {venusPhase2Expansion: true});
    setVenusScaleLevel(game, 14);
    const trBefore = player.terraformRating;
    game.increaseVenusScaleLevel(player, 1);
    expect(game.getVenusScaleLevel()).to.eq(16);
    // +1 for the raise itself, +1 for the bonus.
    expect(player.terraformRating).to.eq(trBefore + 2);
  });

  it('grants no further card/TR bonus for crossing 30 or reaching 60 -- those absolute values were never given a bonus of their own', () => {
    [game, player] = testGame(1, {venusPhase2Expansion: true});
    setVenusScaleLevel(game, 58);
    player.cardsInHand = [];
    const trBefore = player.terraformRating;
    game.increaseVenusScaleLevel(player, 1);
    expect(game.getVenusScaleLevel()).to.eq(60);
    expect(player.cardsInHand).has.length(0);
    // Still +1 TR for the raise itself, same as any other raise -- no extra "reached max" bonus.
    expect(player.terraformRating).to.eq(trBefore + 1);
  });

  // Alt-Venus-board's art/resource ramp is pinned to the official 0-30 track -- Venus Phase 2's
  // extended 30-60 track shouldn't change how many resources it grants or push its "reached max"
  // wild-resource bonus out past 30.
  describe('combined with altVenusBoard', () => {
    it('still grants exactly 1 standard resource crossing 16-18, same as the official game', () => {
      [game, player] = testGame(1, {venusPhase2Expansion: true, altVenusBoard: true});
      setVenusScaleLevel(game, 16);
      game.increaseVenusScaleLevel(player, 1);
      expect(game.getVenusScaleLevel()).to.eq(18);
      const deferred = cast(game.deferredActions.pop(), GrantVenusAltTrackBonusDeferred);
      expect(deferred.standardResourceCount).to.eq(1);
      expect(deferred.wildResource).is.false;
    });

    it('grants the wild resource at 30 (the official max), not 60 (the extended max)', () => {
      [game, player] = testGame(1, {venusPhase2Expansion: true, altVenusBoard: true});
      setVenusScaleLevel(game, 28);
      game.increaseVenusScaleLevel(player, 1);
      expect(game.getVenusScaleLevel()).to.eq(30);
      const deferred = cast(game.deferredActions.pop(), GrantVenusAltTrackBonusDeferred);
      expect(deferred.wildResource).is.true;
    });

    it('grants nothing further for raises past 30, up to 60', () => {
      [game, player] = testGame(1, {venusPhase2Expansion: true, altVenusBoard: true});
      setVenusScaleLevel(game, 30);
      game.increaseVenusScaleLevel(player, 1);
      expect(game.getVenusScaleLevel()).to.eq(32);
      expect(game.deferredActions.pop()).is.undefined;
    });
  });
});
