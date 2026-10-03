import {expect} from 'chai';
import {UtopiaPlanitiaSpaceport} from '../../../src/server/cards/robantilles/UtopiaPlanitiaSpaceport';
import {InterstellarColonyShip} from '../../../src/server/cards/base/InterstellarColonyShip';
import {Sponsors} from '../../../src/server/cards/base/Sponsors';
import {CardName} from '../../../src/common/cards/CardName';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('UtopiaPlanitiaSpaceport', () => {
  let card: UtopiaPlanitiaSpaceport;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new UtopiaPlanitiaSpaceport();
    [game, player] = testGame(2, {turmoilExtension: true});
    player.playedCards.push(card);
  });

  it('offers to capture a Space Event the owner plays', () => {
    const icShip = new InterstellarColonyShip();
    player.playedCards.push(icShip);

    const input = cast(card.onCardPlayed(player, icShip), OrOptions);
    input.options[0].cb(undefined);

    expect(card.data.capturedCard).to.eq(CardName.INTERSTELLAR_COLONY_SHIP);
    expect(player.playedCards.has(CardName.INTERSTELLAR_COLONY_SHIP)).is.false;
  });

  it('ignores non-Space or non-Event cards', () => {
    const notASpaceEvent = new Sponsors();
    expect(card.onCardPlayed(player, notASpaceEvent)).is.undefined;
  });

  it('only holds one Space Event at a time', () => {
    card.data = {capturedCard: CardName.INTERSTELLAR_COLONY_SHIP};
    const another = new InterstellarColonyShip();
    expect(card.onCardPlayed(player, another)).is.undefined;
  });

  it('cannot act without a captured card', () => {
    expect(card.canAct(player)).is.false;
  });

  it('replays the captured event for 8 M€ less, gains TR per VP, and removes it from the game', () => {
    card.data = {capturedCard: CardName.INTERSTELLAR_COLONY_SHIP};
    player.megaCredits = 16;
    player.steel = 0;
    player.titanium = 0;
    const trBefore = player.terraformRating;

    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(player.terraformRating).to.eq(trBefore + 4);
    expect(card.data.capturedCard).is.undefined;
    expect(player.removedFromPlayCards.some((c) => c.name === CardName.INTERSTELLAR_COLONY_SHIP)).is.true;
  });
});
