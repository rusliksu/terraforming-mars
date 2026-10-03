import {expect} from 'chai';
import {CardName} from '../../../src/common/cards/CardName';
import {Tag} from '../../../src/common/cards/Tag';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {SpaceTradingStation} from '../../../src/server/cards/highOrbit/SpaceTradingStation';
import {HighOrbitMarketRow} from '../../../src/common/highOrbit/HighOrbitMarket';

function oneRowMarket(...cardNames: Array<CardName | undefined>): Array<HighOrbitMarketRow> {
  const slots = [...cardNames];
  while (slots.length < 5) {
    slots.push(undefined);
  }
  return [{locked: false, slots}];
}

// High Orbit (fan): Infrastructure cards are never dealt or drawn -- they live in a shared
// market (IGame.highOrbitMarket, 3 rows of 5 slots) and are acquired via
// Player.getHighOrbitInfrastructureOptions as a normal action, paid in Titanium (substitutable
// at 4 M€ per Titanium not spent). Planetary Outpost is the one exception: standard M€ rules,
// no Infrastructure tag. Buying any card in a row locks the whole row for the rest of the
// generation -- see tests/HighOrbitMarket.spec.ts for the market-lifecycle (deal/unlock/refill)
// tests.
describe('High Orbit Infrastructure acquisition', () => {
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    [game, player] = testGame(2, {highOrbitExpansion: true});
    player.tagsForTest = {[Tag.SPACE]: 1};
  });

  it('offers nothing when the expansion is off', () => {
    [game, player] = testGame(2);
    expect(player.getHighOrbitInfrastructureOptions()).has.lengthOf(0);
  });

  it('offers nothing when the market is empty', () => {
    game.highOrbitMarket = oneRowMarket();
    expect(player.getHighOrbitInfrastructureOptions()).has.lengthOf(0);
  });

  it('offers nothing from a locked row', () => {
    game.highOrbitMarket = [{locked: true, slots: [CardName.SPACE_TRADING_STATION, undefined, undefined, undefined, undefined]}];
    player.titanium = 3;
    player.megaCredits = 20;
    expect(player.getHighOrbitInfrastructureOptions()).has.lengthOf(0);
  });

  it('offers nothing for a design whose requirement is unmet', () => {
    player.tagsForTest = {};
    game.highOrbitMarket = oneRowMarket(CardName.SPACE_TRADING_STATION);
    expect(player.getHighOrbitInfrastructureOptions()).has.lengthOf(0);
  });

  it('offers nothing for a design the player already owns', () => {
    game.highOrbitMarket = oneRowMarket(CardName.SPACE_TRADING_STATION);
    player.tagsForTest = {[Tag.SPACE]: 1, [Tag.INFRASTRUCTURE]: 1};
    player.playedCards.push(new SpaceTradingStation());
    expect(player.getHighOrbitInfrastructureOptions()).has.lengthOf(0);
  });

  it('acquires a design paying all Titanium, and locks its row', () => {
    game.highOrbitMarket = oneRowMarket(CardName.SPACE_TRADING_STATION);
    player.titanium = 3;
    player.megaCredits = 20;

    const options = player.getHighOrbitInfrastructureOptions();
    expect(options).has.lengthOf(1);
    const selectAmount = cast(options[0], SelectAmount);
    expect(selectAmount.min).to.eq(0);
    expect(selectAmount.max).to.eq(3);

    selectAmount.cb(3);
    runAllActions(game);

    expect(player.titanium).to.eq(0);
    expect(player.megaCredits).to.eq(20);
    expect(player.tableau.has(CardName.SPACE_TRADING_STATION)).is.true;

    const row = game.highOrbitMarket[0];
    expect(row.locked).is.true;
    expect(row.slots[0]).is.undefined;
  });

  it('locking a row also blocks its other, still-displayed slots', () => {
    game.highOrbitMarket = oneRowMarket(CardName.SPACE_TRADING_STATION, CardName.OBSERVATORY);
    player.titanium = 3;
    player.megaCredits = 20;

    const options = player.getHighOrbitInfrastructureOptions();
    // One option per playable slot before any purchase (Observatory has no Space>Infra gate text
    // difference here, but if it's excluded for another reason that's fine -- the key assertion
    // is what happens after buying from slot 0).
    expect(options.length).to.be.greaterThan(0);
    const selectAmount = cast(options[0], SelectAmount);
    selectAmount.cb(3);
    runAllActions(game);

    // The row is locked now -- even though slot 1 (Observatory) may still hold a card, nothing
    // in this row should be offered any more this generation.
    expect(player.getHighOrbitInfrastructureOptions()).has.lengthOf(0);
  });

  it('acquires a design paying a Titanium/M€ split at 4 M€ per Titanium not spent', () => {
    game.highOrbitMarket = oneRowMarket(CardName.SPACE_TRADING_STATION);
    player.titanium = 1;
    player.megaCredits = 8;

    const options = player.getHighOrbitInfrastructureOptions();
    const selectAmount = cast(options[0], SelectAmount);
    // cost 3: at least 1 titanium is required since only 8 M€ (2 titanium-equivalents) is on hand.
    expect(selectAmount.min).to.eq(1);
    expect(selectAmount.max).to.eq(1);

    selectAmount.cb(1);
    runAllActions(game);

    expect(player.titanium).to.eq(0);
    expect(player.megaCredits).to.eq(0);
    expect(player.tableau.has(CardName.SPACE_TRADING_STATION)).is.true;
  });

  it('excludes an unaffordable design entirely', () => {
    game.highOrbitMarket = oneRowMarket(CardName.SPACE_TRADING_STATION);
    player.titanium = 0;
    player.megaCredits = 0;

    expect(player.getHighOrbitInfrastructureOptions()).has.lengthOf(0);
  });

  it('Planetary Outpost pays the same native-Titanium way as every other design', () => {
    game.highOrbitMarket = oneRowMarket(CardName.PLANETARY_OUTPOST);
    player.megaCredits = 16;
    player.titanium = 4;

    const options = player.getHighOrbitInfrastructureOptions();
    expect(options).has.lengthOf(1);
    const selectAmount = cast(options[0], SelectAmount);
    expect(selectAmount.min).to.eq(0);
    expect(selectAmount.max).to.eq(4);

    selectAmount.cb(4);
    runAllActions(game);

    expect(player.titanium).to.eq(0);
    expect(player.megaCredits).to.eq(16);
    expect(player.tableau.has(CardName.PLANETARY_OUTPOST)).is.true;
    expect(game.highOrbitMarket[0].locked).is.true;
    expect(game.highOrbitMarket[0].slots[0]).is.undefined;
  });
});
