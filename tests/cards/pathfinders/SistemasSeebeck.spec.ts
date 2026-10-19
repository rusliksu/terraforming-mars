import {expect} from 'chai';
import {SistemasSeebeck} from '../../../src/server/cards/pathfinders/SistemasSeebeck';
import {Tag} from '../../../src/common/cards/Tag';
import {Resource} from '../../../src/common/Resource';
import {testGame} from '../../TestGame';
import {runAllActions, fakeCard} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {ProductionRequirement} from '../../../src/server/cards/requirements/ProductionRequirement';
import {TradeWithEnergy} from '../../../src/server/player/Colonies';
import {Pluto} from '../../../src/server/colonies/Pluto';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {cast} from '../../../src/common/utils/utils';
import {Payment} from '../../../src/common/inputs/Payment';
import {LandClaim} from '../../../src/server/cards/base/LandClaim';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectOption} from '../../../src/server/inputs/SelectOption';

import {Units} from '@/common/Units';
import {StormCraftIncorporated} from '@/server/cards/colonies/StormCraftIncorporated';
import {AndOptions} from '@/server/inputs/AndOptions';

describe('SistemasSeebeck', () => {
  let card: SistemasSeebeck;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SistemasSeebeck();
    [game, player] = testGame(1);
  });

  it('has Science and Power tags', () => {
    expect(card.tags).to.deep.eq([Tag.SCIENCE, Tag.POWER]);
  });

  it('starts with 45 M€', () => {
    player.playCorporationCard(card);
    runAllActions(game);
    expect(player.megaCredits).eq(45);
  });

  it('initial action draws until 2 cards that spend energy are found, shuffling the rest back into the deck', () => {
    const match1 = fakeCard({behavior: {spend: {energy: 1}}});
    // Merely granting energy doesn't count - only losing it does. Spending heat doesn't
    // count either - only energy, for starters.
    const nonMatch1 = fakeCard({behavior: {production: {energy: 1}}});
    const nonMatch2 = fakeCard({behavior: {spend: {heat: 2}}});
    const match2 = fakeCard({behavior: {spend: {energy: 1}}});
    // drawPile.pop() draws from the end, so this order draws match1, then the two
    // non-matches, then match2.
    game.projectDeck.drawPile.push(match2, nonMatch2, nonMatch1, match1);

    card.initialAction(player);
    runAllActions(game);

    expect(player.cardsInHand).includes(match1);
    expect(player.cardsInHand).includes(match2);
    expect(player.cardsInHand).not.includes(nonMatch1);
    expect(player.cardsInHand).not.includes(nonMatch2);

    // Rejected cards go back into the drawPile, not the discard pile - unlike the generic
    // "draw until match" mechanism most cards use.
    expect(game.projectDeck.discardPile).not.includes(nonMatch1);
    expect(game.projectDeck.discardPile).not.includes(nonMatch2);
    expect(game.projectDeck.drawPile).includes(nonMatch1);
    expect(game.projectDeck.drawPile).includes(nonMatch2);
  });

  it('reshuffles the deck once the rejects are back in it', () => {
    const match1 = fakeCard({behavior: {spend: {energy: 1}}});
    const match2 = fakeCard({behavior: {spend: {energy: 1}}});
    const rejects = Array.from({length: 10}, () => fakeCard({behavior: {production: {plants: 1}}}));
    // drawPile.pop() draws from the end - put the 2 matches at the very bottom so every
    // reject gets drawn (and shuffled back) first.
    game.projectDeck.drawPile.push(match1, match2, ...rejects);
    const orderBefore = [...game.projectDeck.drawPile];

    card.initialAction(player);
    runAllActions(game);

    expect(player.cardsInHand).includes(match1);
    expect(player.cardsInHand).includes(match2);
    for (const reject of rejects) {
      expect(game.projectDeck.drawPile).includes(reject);
    }
    // The 10 rejects landing back in exactly the same order they were drawn out in would be
    // an ~1-in-3.6-million coincidence if they were truly reshuffled.
    expect(game.projectDeck.drawPile).to.not.deep.eq(orderBefore.filter((c) => rejects.includes(c)));
  });

  it('also matches a card that reduces energy production, like Hackers, not just ones that spend it', () => {
    const productionMatch1 = fakeCard({behavior: {production: {energy: -1, megacredits: 2}}}); // Hackers' shape
    const productionMatch2 = fakeCard({behavior: {production: {energy: -1}}});
    // Growing energy production doesn't count - only losing it does.
    const nonMatch1 = fakeCard({behavior: {production: {energy: 2}}});
    const nonMatch2 = fakeCard({behavior: {production: {heat: -3}}});
    game.projectDeck.drawPile.push(productionMatch2, nonMatch2, nonMatch1, productionMatch1);

    card.initialAction(player);
    runAllActions(game);

    expect(player.cardsInHand).includes(productionMatch1);
    expect(player.cardsInHand).includes(productionMatch2);
    expect(player.cardsInHand).not.includes(nonMatch1);
    expect(player.cardsInHand).not.includes(nonMatch2);
  });

  it('also matches a repeatable action that spends energy, like Ironworks', () => {
    // Most real energy spenders (Ironworks' "spend 4 energy", Steelworks, etc.) cost it as
    // their repeatable action, not their one-time play behavior - the initial draw filter
    // must check both, or it finds almost nothing to draw into.
    const actionMatch1 = fakeCard({actionBehavior: {spend: {energy: 4}}});
    const actionMatch2 = fakeCard({actionBehavior: {spend: {energy: 2}}});
    const nonMatch1 = fakeCard({behavior: {production: {heat: 1}}});
    const nonMatch2 = fakeCard({actionBehavior: {spend: {heat: 3}}});
    game.projectDeck.drawPile.push(actionMatch2, nonMatch2, nonMatch1, actionMatch1);

    card.initialAction(player);
    runAllActions(game);

    expect(player.cardsInHand).includes(actionMatch1);
    expect(player.cardsInHand).includes(actionMatch2);
    expect(player.cardsInHand).not.includes(nonMatch1);
    expect(player.cardsInHand).not.includes(nonMatch2);
  });

  it('spend.energy can be paid with heat', () => {
    player.playedCards.push(card);
    player.energy = 1;
    player.heat = 2;
    player.spendEnergy(3);
    expect(player.energy).eq(0);
    expect(player.heat).eq(0);
  });

  it('spend.heat can be paid with energy', () => {
    player.playedCards.push(card);
    player.heat = 1;
    player.energy = 2;
    player.spendHeat(3);
    expect(player.heat).eq(0);
    expect(player.energy).eq(0);
  });

  it('availableEnergy and availableHeat are combined, but only with the card in play', () => {
    player.energy = 2;
    player.heat = 3;
    expect(player.availableEnergy()).eq(2);
    expect(player.availableHeat()).eq(3);

    player.playedCards.push(card);
    expect(player.availableEnergy()).eq(5);
    expect(player.availableHeat()).eq(5);
  });

  it('production requirements treat energy and heat production as one combined pool', () => {
    const requirement = new ProductionRequirement(Resource.ENERGY, {count: 3});
    player.production.override({energy: 1, heat: 1});
    expect(requirement.satisfies(player, card)).is.false;

    player.playedCards.push(card);
    expect(requirement.satisfies(player, card)).is.false;

    player.production.override({energy: 1, heat: 2});
    expect(requirement.satisfies(player, card)).is.true;
  });

  it('colony trading with energy can be paid for with heat', () => {
    player.playedCards.push(card);
    player.energy = 1;
    player.heat = 2;

    const trader = new TradeWithEnergy(player);
    expect(trader.canUse()).is.true;

    trader.trade(new Pluto());

    expect(player.energy).eq(0);
    expect(player.heat).eq(0);
  });

  it('without Sistemas Seebeck, colony trading with energy cannot be covered by heat', () => {
    player.energy = 1;
    player.heat = 2;

    const trader = new TradeWithEnergy(player);
    expect(trader.canUse()).is.false;
  });

  it('a card reducing heat production offers a choice of how to split the loss with energy', () => {
    player.playedCards.push(card);
    player.production.override({heat: 3, energy: 2});

    player.production.add(Resource.HEAT, -2, {log: true});
    runAllActions(game);

    const input = cast(player.popWaitingFor(), SelectAmount);
    expect(input.min).eq(0);
    expect(input.max).eq(2);

    input.cb(1); // 1 from heat, 1 from energy

    expect(player.production.heat).eq(2);
    expect(player.production.energy).eq(1);
  });

  it('does not offer a choice when the other side has no room', () => {
    player.playedCards.push(card);
    player.production.override({heat: 3, energy: 0});

    player.production.add(Resource.HEAT, -2, {log: true});
    runAllActions(game);

    expect(player.popWaitingFor()).is.undefined;
    expect(player.production.heat).eq(1);
    expect(player.production.energy).eq(0);
  });

  it('the combined pool is the real floor - a big reduction can dip into both', () => {
    player.playedCards.push(card);
    player.production.override({heat: 1, energy: 1});

    // Asking for 5 heat production, but only 2 exist combined - 1 from each is the only
    // possible split, so no choice is offered.
    player.production.add(Resource.HEAT, -5, {log: true});
    runAllActions(game);

    expect(player.popWaitingFor()).is.undefined;
    expect(player.production.heat).eq(0);
    expect(player.production.energy).eq(0);
  });

  it('the combined pool is the real floor, with a real choice when there is room on both sides', () => {
    player.playedCards.push(card);
    player.production.override({heat: 3, energy: 3});

    // Asking for 5 heat production, but only 6 exist combined - capped at 5 total lost,
    // and anywhere from 2 to 3 of it can come from heat.
    player.production.add(Resource.HEAT, -5, {log: true});
    runAllActions(game);

    const input = cast(player.popWaitingFor(), SelectAmount);
    expect(input.min).eq(2);
    expect(input.max).eq(3);
    input.cb(2);

    expect(player.production.heat).eq(1);
    expect(player.production.energy).eq(0);
  });

  it('without Sistemas Seebeck, a heat production reduction is not redirected', () => {
    player.production.override({heat: 3, energy: 2});

    player.production.add(Resource.HEAT, -2, {log: true});
    runAllActions(game);

    expect(player.popWaitingFor()).is.undefined;
    expect(player.production.heat).eq(1);
    expect(player.production.energy).eq(2);
  });

  it('with canUseHeatAsMegaCredits (e.g. Merger\'d Helion), energy can cover a heat payment', () => {
    player.playedCards.push(card);
    player.canUseHeatAsMegaCredits = true;
    player.heat = 0;
    player.energy = 3;
    player.megaCredits = 0;

    const landClaim = new LandClaim(); // cost 1
    expect(() => player.checkPaymentAndPlayCard(landClaim, Payment.of({heat: 1}))).to.not.throw();

    expect(player.energy).eq(2);
    expect(player.heat).eq(0);
  });

  it('without Sistemas Seebeck, canUseHeatAsMegaCredits alone does not let energy cover a heat payment', () => {
    player.canUseHeatAsMegaCredits = true;
    player.heat = 0;
    player.energy = 3;
    player.megaCredits = 0;

    const landClaim = new LandClaim();
    expect(() => player.checkPaymentAndPlayCard(landClaim, Payment.of({heat: 1}))).to.throw();
  });

  it('reserves energy and heat from the same pool before paying', () => {
    player.playedCards.push(card);
    player.canUseHeatAsMegaCredits = true;
    player.energy = 3;
    player.megaCredits = 0;
    expect(player.canAfford({cost: 3, reserveUnits: Units.of({energy: 3})})).is.false;
    expect(player.canSpend(Payment.of({heat: 3}), Units.of({energy: 3}))).is.false;
    expect(player.canAfford({cost: 0, reserveUnits: Units.of({energy: 2, heat: 2})})).is.false;
    expect(player.canSpend(Payment.of({energy: 2, heat: 2}))).is.false;
  });

  it('allocates whole Stormcraft floaters between payment and reserved heat', () => {
    const stormcraft = new StormCraftIncorporated();
    stormcraft.resourceCount = 1;
    player.playedCards.push(stormcraft);
    player.canUseHeatAsMegaCredits = true;
    player.megaCredits = 0;
    player.heat = 1;
    const reserve = Units.of({heat: 2});
    expect(player.canAfford({cost: 1, reserveUnits: reserve})).is.true;
    expect(player.canSpend(Payment.of({heat: 1}), reserve)).is.true;
    player.heat = 0;
    expect(player.canAfford({cost: 1, reserveUnits: Units.of({heat: 1})})).is.false;
    expect(player.canSpend(Payment.of({heat: 1}), Units.of({heat: 1}))).is.false;
  });

  it('deducts heat used as energy in a monetary payment', () => {
    player.playedCards.push(card);
    player.canUseEnergyAsMegaCredits = true;
    player.heat = 3;
    expect(player.canSpend(Payment.of({energy: 3}))).is.true;
    player.pay(Payment.of({energy: 3}));
    runAllActions(game);
    expect(player.heat).eq(0);
  });

  it('preserves the selected payment resource before using the other stock', () => {
    player.playedCards.push(card);
    player.heat = 5;
    player.energy = 5;
    player.pay(Payment.of({heat: 1}));
    expect(player.heat).eq(4);
    expect(player.energy).eq(5);
    player.pay(Payment.of({energy: 1}));
    expect(player.heat).eq(4);
    expect(player.energy).eq(4);
  });

  it('values the shared pool once when both monetary conversions are enabled', () => {
    player.playedCards.push(card);
    player.canUseHeatAsMegaCredits = true;
    player.canUseEnergyAsMegaCredits = true;
    player.energy = 2;
    player.megaCredits = 0;
    expect(player.spendableMegacredits()).eq(4);
    expect(player.canAfford(5)).is.false;
    expect(player.canAfford(4)).is.true;
  });

  it('requires Stormcraft payment before completing an energy colony trade', () => {
    player.playedCards.push(card);
    const stormcraft = new StormCraftIncorporated();
    stormcraft.resourceCount = 1;
    player.playedCards.push(stormcraft);
    player.energy = 1;
    const colony = new Pluto();
    const trader = new TradeWithEnergy(player);
    expect(trader.canUse()).is.true;
    trader.trade(colony);
    expect(colony.visitor).is.undefined;
    runAllActions(game);
    const payment = cast(player.popWaitingFor(), AndOptions);
    payment.process({type: 'and', responses: [{type: 'amount', amount: 0}, {type: 'amount', amount: 1}]}, player);
    expect(stormcraft.resourceCount).eq(0);
    expect(player.energy).eq(0);
    expect(colony.visitor).eq(player.id);
    expect(game.gameLog.find((entry) => entry.message.includes('energy to trade'))?.payment).is.undefined;
  });

  it('can spend energy alongside Stormcraft floaters as heat', () => {
    player.playedCards.push(card);
    const stormcraft = new StormCraftIncorporated();
    stormcraft.resourceCount = 1;
    player.playedCards.push(stormcraft);
    player.energy = 6;
    let completed = false;
    const payment = cast(player.spendHeat(8, () => {
      completed = true; return undefined;
    }), AndOptions);
    payment.process({type: 'and', responses: [{type: 'amount', amount: 6}, {type: 'amount', amount: 1}]}, player);
    expect(completed).is.true;
    expect(stormcraft.resourceCount).eq(0);
    expect(player.energy).eq(0);
  });

  describe('free energy/heat conversion', () => {
    it('is unavailable without the card', () => {
      player.heat = 5;
      player.energy = 5;
      player.production.override({heat: 5, energy: 5});
      expect(SistemasSeebeck.buildFreeConvertAction(player)).is.undefined;
    });

    it('is unavailable with nothing to convert', () => {
      player.playedCards.push(card);
      player.heat = 0;
      player.energy = 0;
      player.production.override({heat: 0, energy: 0});
      expect(SistemasSeebeck.buildFreeConvertAction(player)).is.undefined;
    });

    it('only offers the directions that actually have something to convert', () => {
      player.playedCards.push(card);
      player.heat = 3;
      player.energy = 0;
      player.production.override({heat: 0, energy: 0});

      const menu = cast(SistemasSeebeck.buildFreeConvertAction(player), OrOptions);
      expect(menu.options).has.lengthOf(1);
      expect(menu.options[0].title.toString()).to.include('heat to energy');
    });

    it('converts stock 1:1', () => {
      player.playedCards.push(card);
      player.heat = 3;
      player.energy = 1;

      const menu = cast(SistemasSeebeck.buildFreeConvertAction(player), OrOptions);
      const heatToEnergy = cast(
        menu.options.find((o) => (o as SelectOption).title.toString().includes('heat to energy')),
        SelectOption);
      const amountInput = cast(heatToEnergy.cb(undefined), SelectAmount);
      expect(amountInput.min).eq(1);
      expect(amountInput.max).eq(3);

      amountInput.cb(2);

      expect(player.heat).eq(1);
      expect(player.energy).eq(3);
    });

    it('converts production 1:1 without triggering the redistribution prompt', () => {
      player.playedCards.push(card);
      player.production.override({heat: 3, energy: 1});

      const menu = cast(SistemasSeebeck.buildFreeConvertAction(player), OrOptions);
      const heatToEnergy = cast(
        menu.options.find((o) => (o as SelectOption).title.toString().includes('heat production to energy production')),
        SelectOption);
      const amountInput = cast(heatToEnergy.cb(undefined), SelectAmount);

      amountInput.cb(2);
      runAllActions(game);

      expect(player.popWaitingFor()).is.undefined; // no redistribution choice offered
      expect(player.production.heat).eq(1);
      expect(player.production.energy).eq(3);
    });

    it('does not consume the turn\'s action', () => {
      player.playedCards.push(card);
      player.heat = 3;
      player.energy = 0;
      player.megaCredits = 200;
      expect(player.actionsTakenThisRound).eq(0);

      player.takeAction();
      const [topLevel, topLevelCb] = player.popWaitingFor2();
      const menu = cast(topLevel, OrOptions);
      const seebeckMenu = cast(
        menu.options.find((o) => o instanceof OrOptions && o.title.toString().includes('Sistemas Seebeck')),
        OrOptions);
      const heatToEnergy = cast(
        seebeckMenu.options.find((o) => (o as SelectOption).title.toString().includes('heat to energy')),
        SelectOption);

      const amountInput = cast(heatToEnergy.cb(undefined), SelectAmount);
      amountInput.cb(2);
      topLevelCb?.();

      expect(player.actionsTakenThisRound).eq(0);
      expect(player.heat).eq(1);
      expect(player.energy).eq(2);
    });
  });
});
