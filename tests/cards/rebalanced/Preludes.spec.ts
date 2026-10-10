import {expect} from 'chai';
import {Units} from '@/common/Units';
import {CardType} from '@/common/cards/CardType';
import {Payment} from '@/common/inputs/Payment';
import {PartyName} from '@/common/turmoil/PartyName';
import {cast} from '@/common/utils/utils';
import {PreludeCard} from '@/server/cards/prelude/PreludeCard';
import {BiofuelsRebalanced} from '@/server/cards/rebalanced/BiofuelsRebalanced';
import {BiosphereSupportRebalanced} from '@/server/cards/rebalanced/BiosphereSupportRebalanced';
import {DomeFarmingRebalanced} from '@/server/cards/rebalanced/DomeFarmingRebalanced';
import {DonationRebalanced} from '@/server/cards/rebalanced/DonationRebalanced';
import {EarlySettlementRebalanced} from '@/server/cards/rebalanced/EarlySettlementRebalanced';
import {EccentricSponsorRebalanced} from '@/server/cards/rebalanced/EccentricSponsorRebalanced';
import {GalileanMiningRebalanced} from '@/server/cards/rebalanced/GalileanMiningRebalanced';
import {HugeAsteroidRebalanced} from '@/server/cards/rebalanced/HugeAsteroidRebalanced';
import {IoResearchOutpostRebalanced} from '@/server/cards/rebalanced/IoResearchOutpostRebalanced';
import {LoanRebalanced} from '@/server/cards/rebalanced/LoanRebalanced';
import {MartianIndustriesRebalanced} from '@/server/cards/rebalanced/MartianIndustriesRebalanced';
import {MetalsCompanyRebalanced} from '@/server/cards/rebalanced/MetalsCompanyRebalanced';
import {MoholeExcavationRebalanced} from '@/server/cards/rebalanced/MoholeExcavationRebalanced';
import {MoholeRebalanced} from '@/server/cards/rebalanced/MoholeRebalanced';
import {NitrogenDeliveryRebalanced} from '@/server/cards/rebalanced/NitrogenDeliveryRebalanced';
import {OrbitalConstructionYardRebalanced} from '@/server/cards/rebalanced/OrbitalConstructionYardRebalanced';
import {PolarIndustriesRebalanced} from '@/server/cards/rebalanced/PolarIndustriesRebalanced';
import {SelfSufficientSettlementRebalanced} from '@/server/cards/rebalanced/SelfSufficientSettlementRebalanced';
import {SmeltingPlantRebalanced} from '@/server/cards/rebalanced/SmeltingPlantRebalanced';
import {SocietySupportRebalanced} from '@/server/cards/rebalanced/SocietySupportRebalanced';
import {SupplyDropRebalanced} from '@/server/cards/rebalanced/SupplyDropRebalanced';
import {BuildColonyStandardProjectRebalanced} from '@/server/cards/rebalanced/BuildColonyStandardProjectRebalanced';
import {NitrogenRichAsteroid} from '@/server/cards/base/NitrogenRichAsteroid';
import {Steelworks} from '@/server/cards/base/Steelworks';
import {SearchForLife} from '@/server/cards/base/SearchForLife';
import {Luna} from '@/server/colonies/Luna';
import {Venus} from '@/server/cards/community/Venus';
import {SelectColony} from '@/server/inputs/SelectColony';
import {SelectPayment} from '@/server/inputs/SelectPayment';
import {SelectProjectCardToPlay} from '@/server/inputs/SelectProjectCardToPlay';
import {testGame} from '../../TestGame';
import {runAllActions, setRulingParty, setTemperature} from '../../TestingUtils';
import {assertPlaceCity, assertPlaceOcean} from '../../assertions';
import reference from './reference.json';

describe('Rebalanced preludes and colony standard project', () => {
  const cases: Array<{
    factory: new () => PreludeCard;
    symbol: string;
    production?: Partial<Units>;
    stock?: Partial<Units>;
    cards?: number;
    tr?: number;
    temperature?: number;
    oxygen?: number;
    city?: boolean;
    ocean?: boolean;
  }> = [
    {factory: BiofuelsRebalanced, symbol: 'BIOFUELS_REBALANCED', production: {energy: 2, plants: 1}, stock: {plants: 2}},
    {factory: BiosphereSupportRebalanced, symbol: 'BIOSPHERE_SUPPORT_REBALANCED', production: {plants: 2, megacredits: 1}},
    {factory: DomeFarmingRebalanced, symbol: 'DOME_FARMING_REBALANCED', production: {megacredits: 3, plants: 1}},
    {factory: DonationRebalanced, symbol: 'DONATION_REBALANCED', stock: {megacredits: 23}},
    {factory: EarlySettlementRebalanced, symbol: 'EARLY_SETTLEMENT_REBALANCED', production: {plants: 1}, stock: {plants: 3}, city: true},
    {factory: GalileanMiningRebalanced, symbol: 'GALILEAN_MINING_REBALANCED', production: {titanium: 2}},
    {factory: HugeAsteroidRebalanced, symbol: 'HUGE_ASTEROID_REBALANCED', stock: {megacredits: -2}, temperature: 6, tr: 3},
    {factory: IoResearchOutpostRebalanced, symbol: 'IO_RESEARCH_OUTPOST_REBALANCED', production: {titanium: 1}, cards: 2},
    {factory: LoanRebalanced, symbol: 'LOAN_REBALANCED', production: {megacredits: -2}, stock: {megacredits: 32}},
    {factory: MartianIndustriesRebalanced, symbol: 'MARTIAN_INDUSTRIES_REBALANCED', production: {energy: 1, steel: 1}, stock: {megacredits: 6}},
    {factory: MetalsCompanyRebalanced, symbol: 'METALS_COMPANY_REBALANCED', production: {megacredits: 1, steel: 1, titanium: 1}, stock: {megacredits: 2}},
    {factory: MoholeExcavationRebalanced, symbol: 'MOHOLE_EXCAVATION_REBALANCED', production: {steel: 1, heat: 2}, stock: {steel: 5}},
    {factory: MoholeRebalanced, symbol: 'MOHOLE_REBALANCED', production: {heat: 2, energy: 1}, stock: {energy: 3, heat: 5}},
    {factory: NitrogenDeliveryRebalanced, symbol: 'NITROGEN_SHIPMENT_REBALANCED', stock: {plants: 5}, tr: 2},
    {factory: OrbitalConstructionYardRebalanced, symbol: 'ORBITAL_CONSTRUCTION_YARD_REBALANCED', production: {titanium: 1}, stock: {titanium: 5}},
    {factory: PolarIndustriesRebalanced, symbol: 'POLAR_INDUSTRIES_REBALANCED', production: {heat: 2}, stock: {megacredits: 5}, ocean: true, tr: 1},
    {factory: SelfSufficientSettlementRebalanced, symbol: 'SELF_SUFFICIENT_SETTLEMENT_REBALANCED', production: {megacredits: 2}, stock: {megacredits: 3}, city: true},
    {factory: SmeltingPlantRebalanced, symbol: 'SMELTING_PLANT_REBALANCED', stock: {steel: 4}, cards: 1, oxygen: 2, tr: 2},
    {factory: SocietySupportRebalanced, symbol: 'SOCIETY_SUPPORT_REBALANCED', production: {plants: 1, energy: 1, heat: 1}, stock: {megacredits: -3}},
    {factory: SupplyDropRebalanced, symbol: 'SUPPLY_DROP_REBALANCED', stock: {titanium: 3, steel: 7, plants: 3}},
  ];

  for (const scenario of cases) {
    it(`plays ${scenario.symbol} with the published effects`, () => {
      const Prelude = scenario.factory;
      const card = new Prelude();
      const [game, player] = testGame(1, {preludeExtension: true, prelude2Expansion: true});
      player.production.override({});
      player.stock.override({megacredits: 20});
      player.cardsInHand = [];
      setTemperature(game, -10);
      const initialTR = player.terraformRating;
      const building = new Steelworks();
      const science = new SearchForLife();
      game.projectDeck.drawPile = [new SearchForLife(), building, science];
      game.projectDeck.discardPile = [];

      expect(card.canPlay(player)).is.true;
      expect(card.play(player)).is.undefined;
      runAllActions(game);
      if (scenario.city) {
        assertPlaceCity(player, player.popWaitingFor());
      }
      if (scenario.ocean) {
        assertPlaceOcean(player, player.popWaitingFor());
      }
      runAllActions(game);

      expect(player.production.asUnits()).deep.eq(Units.of(scenario.production ?? {}));
      expect(player.stock.asUnits()).deep.eq(Units.of({
        ...scenario.stock,
        megacredits: 20 + (scenario.stock?.megacredits ?? 0),
      }));
      expect(card.startingMegaCredits).eq(scenario.stock?.megacredits ?? 0);
      expect(player.terraformRating).eq(initialTR + (scenario.tr ?? 0));
      expect(game.getTemperature()).eq(-10 + (scenario.temperature ?? 0));
      expect(game.getOxygenLevel()).eq(scenario.oxygen ?? 0);
      expect(player.cardsInHand).has.length(scenario.cards ?? 0);
      if (scenario.symbol === 'SMELTING_PLANT_REBALANCED') {
        expect(player.cardsInHand).deep.eq([building]);
        expect(game.projectDeck.discardPile).includes(science);
      }
      expect(player.popWaitingFor()).is.undefined;
    });
  }

  it('matches published names, types, tags and card numbers', () => {
    const factories = [...cases, {factory: EccentricSponsorRebalanced, symbol: 'ECCENTRIC_SPONSOR_REBALANCED'}];
    expect(factories).has.length(21);
    for (const {factory: Prelude, symbol} of factories) {
      const card = new Prelude();
      const expected = reference.cards.find((entry) => entry.symbol === symbol)!;
      expect(card.name, symbol).eq(expected.name);
      expect(card.type, symbol).eq(CardType.PRELUDE);
      expect(card.tags, symbol).deep.eq(expected.tags);
      expect(card.metadata.cardNumber, symbol).eq(expected.texts[0]);
      if (symbol !== 'ECCENTRIC_SPONSOR_REBALANCED') {
        expect(card.metadata.description, symbol).eq(expected.texts[1]);
      }
    }
    const colony = new BuildColonyStandardProjectRebalanced();
    const expected = reference.cards.find((entry) => entry.symbol === 'BUILD_COLONY_STANDARD_PROJECT_REBALANCED')!;
    expect(colony.name).eq(expected.name);
    expect(colony.type).eq(CardType.STANDARD_PROJECT);
    expect(colony.cost).eq(17);
    expect(colony.tags).deep.eq([]);
    expect(colony.metadata.cardNumber).eq('SP5');
  });

  it('requires only the published payment for Huge Asteroid and Society Support', () => {
    const [game, player] = testGame(1);
    for (const [card, amount] of [[new HugeAsteroidRebalanced(), 2], [new SocietySupportRebalanced(), 3]] as const) {
      player.megaCredits = amount - 1;
      expect(card.canPlay(player), card.name).is.false;
      player.megaCredits = amount;
      expect(card.canPlay(player), card.name).is.true;
      expect(card.startingMegaCredits, card.name).eq(-amount);
      card.play(player);
      runAllActions(game);
      expect(player.megaCredits, card.name).eq(0);
    }
  });

  it('allows Society Support at the M€ production floor and payment with heat', () => {
    const card = new SocietySupportRebalanced();
    const [game, player] = testGame(1);
    player.production.megacredits = -5;
    player.megaCredits = 0;
    player.heat = 3;
    player.canUseHeatAsMegaCredits = true;
    expect(card.canPlay(player)).is.true;
    card.play(player);
    runAllActions(game);
    const payment = cast(player.popWaitingFor(), SelectPayment);
    expect(payment.amount).eq(3);
    payment.cb(Payment.of({heat: 3}));
    expect(player.heat).eq(0);
    expect(player.production.megacredits).eq(-5);
  });

  it('preserves the Loan production minimum', () => {
    const card = new LoanRebalanced();
    const [game, player] = testGame(1);
    player.production.megacredits = -4;
    expect(card.canPlay(player)).is.false;
    player.production.megacredits = -3;
    expect(card.canPlay(player)).is.true;
    card.play(player);
    runAllActions(game);
    expect(player.production.megacredits).eq(-5);
    expect(player.megaCredits).eq(32);
  });

  it('plays one project with a 27 M€ discount and then ends the discount', () => {
    const card = new EccentricSponsorRebalanced();
    const [game, player] = testGame(1);
    const project = new NitrogenRichAsteroid();
    player.cardsInHand = [project];
    player.megaCredits = 4;
    expect(card.getCardDiscount(player)).eq(0);
    player.playCard(card);
    runAllActions(game);
    const waitingFor = player.popWaitingFor();
    expect(waitingFor).instanceOf(SelectProjectCardToPlay);
    const input = cast(waitingFor, SelectProjectCardToPlay);
    expect(input.cards).deep.eq([project]);
    expect(card.getCardDiscount(player)).eq(27);
    expect(player.getCardCost(project)).eq(4);
    input.payAndPlay(project, Payment.of({megacredits: 4}));
    runAllActions(game);
    expect(player.megaCredits).eq(0);
    expect(player.playedCards.has(project.name)).is.true;
    expect(card.getCardDiscount(player)).eq(0);
  });

  it('clears the Eccentric Sponsor discount when its project play fizzles', () => {
    const card = new EccentricSponsorRebalanced();
    const [game, player] = testGame(1);
    player.cardsInHand = [];
    player.playCard(card);
    runAllActions(game);
    expect(player.popWaitingFor()).is.undefined;
    expect(player.megaCredits).eq(15);
    expect(player.lastCardPlayed).is.undefined;
    expect(player.playedCards.has(card.name)).is.false;
    expect(card.getCardDiscount(player)).eq(0);
  });

  it('pays 17 M€ and builds a colony using the current engine', () => {
    const card = new BuildColonyStandardProjectRebalanced();
    const [game, player] = testGame(1, {coloniesExtension: true});
    const luna = new Luna();
    luna.isActive = true;
    game.colonies = [luna];
    player.production.override({});
    player.megaCredits = 16;
    expect(card.canAct(player)).is.false;
    player.megaCredits = 17;
    expect(card.canAct(player)).is.true;
    card.payAndExecute(player, Payment.of({megacredits: 17}));
    runAllActions(game);
    const input = cast(player.popWaitingFor(), SelectColony);
    expect(input.colonies).deep.eq([luna]);
    input.cb(luna);
    runAllActions(game);
    expect(luna.colonies).deep.eq([player.id]);
    expect(player.megaCredits).eq(0);
    expect(player.production.megacredits).eq(2);
    expect(player.standardProjectsThisGeneration.has(card.name)).is.true;
    player.megaCredits = 17;
    expect(card.canAct(player)).is.false;
  });

  it('rejects inactive and full colony tiles and games without colonies', () => {
    const card = new BuildColonyStandardProjectRebalanced();
    const [game, player, player2, player3, player4] = testGame(4, {coloniesExtension: true});
    const luna = new Luna();
    game.colonies = [luna];
    player.megaCredits = 17;
    luna.isActive = false;
    expect(card.canAct(player)).is.false;
    luna.isActive = true;
    luna.colonies.push(player2.id, player3.id, player4.id);
    expect(card.canAct(player)).is.false;
    game.colonies = [];
    expect(card.canAct(player)).is.false;
  });

  it('includes the Reds surcharge when building on Venus', () => {
    const card = new BuildColonyStandardProjectRebalanced();
    const [game, player] = testGame(1, {coloniesExtension: true, venusNextExtension: true, turmoilExtension: true});
    const venus = new Venus();
    venus.isActive = true;
    game.colonies = [venus];
    player.megaCredits = 17;
    expect(card.canAct(player)).is.true;
    setRulingParty(game, PartyName.REDS);
    expect(card.canAct(player)).is.false;
    player.megaCredits = 20;
    expect(card.canAct(player)).is.true;
  });
});
