import {expect} from 'chai';
import {TerrainLease} from '../../../src/server/cards/solaris/TerrainLease';
import {SellPatentsStandardProject} from '../../../src/server/cards/base/standardProjects/SellPatentsStandardProject';
import {CityStandardProject} from '../../../src/server/cards/base/standardProjects/CityStandardProject';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, runAllActions} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';

describe('TerrainLease', () => {
  let card: TerrainLease;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new TerrainLease();
    [game, player] = testGame(1, {turmoilExtension: true});
  });

  it('cannot play without Reds ruling or 2 delegates', () => {
    setRulingParty(game, PartyName.GREENS);
    expect(card.canPlay(player)).is.false;
    setRulingParty(game, PartyName.REDS);
    expect(card.canPlay(player)).is.true;
  });

  it('raises TR 1 step on play', () => {
    setRulingParty(game, PartyName.REDS);
    // Reds ruling taxes TR increases -- fund the player so the tax doesn't block the gain.
    player.megaCredits = 10;
    const trBefore = player.terraformRating;
    card.play(player);
    runAllActions(game);
    expect(player.terraformRating).to.eq(trBefore + 1);
  });

  it('gains 1 M€ when a standard project other than Sell Patents is used', () => {
    const megaCreditsBefore = player.megaCredits;
    card.onStandardProject(player, new CityStandardProject());
    expect(player.megaCredits).to.eq(megaCreditsBefore + 1);
  });

  it('does not gain M€ for Sell Patents', () => {
    const megaCreditsBefore = player.megaCredits;
    card.onStandardProject(player, new SellPatentsStandardProject());
    expect(player.megaCredits).to.eq(megaCreditsBefore);
  });
});
