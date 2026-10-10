import {expect} from 'chai';
import {Units} from '@/common/Units';
import {CardResource} from '@/common/CardResource';
import {TileType} from '@/common/TileType';
import {SpaceType} from '@/common/boards/SpaceType';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {PartyName} from '@/common/turmoil/PartyName';
import {cast} from '@/common/utils/utils';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';
import {PhoboLogRebalanced} from '@/server/cards/rebalanced/PhoboLogRebalanced';
import {PointLunaRebalanced} from '@/server/cards/rebalanced/PointLunaRebalanced';
import {PolyphemosRebalanced} from '@/server/cards/rebalanced/PolyphemosRebalanced';
import {PoseidonRebalanced} from '@/server/cards/rebalanced/PoseidonRebalanced';
import {PristarRebalanced} from '@/server/cards/rebalanced/PristarRebalanced';
import {RecyclonRebalanced} from '@/server/cards/rebalanced/RecyclonRebalanced';
import {RobinsonIndustriesRebalanced} from '@/server/cards/rebalanced/RobinsonIndustriesRebalanced';
import {SpliceRebalanced} from '@/server/cards/rebalanced/SpliceRebalanced';
import {StormCraftIncorporatedRebalanced} from '@/server/cards/rebalanced/StormCraftIncorporatedRebalanced';
import {TerralabsResearchRebalanced} from '@/server/cards/rebalanced/TerralabsResearchRebalanced';
import {TharsisRepublicRebalanced} from '@/server/cards/rebalanced/TharsisRepublicRebalanced';
import {ThorgateRebalanced} from '@/server/cards/rebalanced/ThorgateRebalanced';
import {UnitedNationsMarsInitiativeRebalanced} from '@/server/cards/rebalanced/UnitedNationsMarsInitiativeRebalanced';
import {UtopiaInvestRebalanced} from '@/server/cards/rebalanced/UtopiaInvestRebalanced';
import {VironRebalanced} from '@/server/cards/rebalanced/VironRebalanced';
import {VitorRebalanced} from '@/server/cards/rebalanced/VitorRebalanced';
import {SolarWindPower} from '@/server/cards/base/SolarWindPower';
import {Comet} from '@/server/cards/base/Comet';
import {Steelworks} from '@/server/cards/base/Steelworks';
import {EarthCatapult} from '@/server/cards/base/EarthCatapult';
import {MagneticFieldGenerators} from '@/server/cards/base/MagneticFieldGenerators';
import {SearchForLife} from '@/server/cards/base/SearchForLife';
import {DustSeals} from '@/server/cards/base/DustSeals';
import {Ants} from '@/server/cards/base/Ants';
import {Tardigrades} from '@/server/cards/base/Tardigrades';
import {Hackers} from '@/server/cards/base/Hackers';
import {LavaFlows} from '@/server/cards/base/LavaFlows';
import {FloaterTechnology} from '@/server/cards/colonies/FloaterTechnology';
import {FloatingHabs} from '@/server/cards/venusNext/FloatingHabs';
import {PhoboLog} from '@/server/cards/corporation/PhoboLog';
import {StormCraftIncorporated} from '@/server/cards/colonies/StormCraftIncorporated';
import {PowerPlantStandardProject} from '@/server/cards/base/standardProjects/PowerPlantStandardProject';
import {HE3FusionPlant} from '@/server/cards/moon/HE3FusionPlant';
import {serializeCorporationCard} from '@/server/cards/cardSerialization';
import {SelectCard} from '@/server/inputs/SelectCard';
import {SelectColony} from '@/server/inputs/SelectColony';
import {SelectAmount} from '@/server/inputs/SelectAmount';
import {AndOptions} from '@/server/inputs/AndOptions';
import {OrOptions} from '@/server/inputs/OrOptions';
import {Io} from '@/server/colonies/Io';
import {Luna} from '@/server/colonies/Luna';
import {testGame} from '../../TestGame';
import {addCity, churn, runAllActions, setRulingParty} from '../../TestingUtils';
import {assertPlaceCity} from '../../assertions';
import reference from './reference.json';

describe('Rebalanced corporations, group 2', () => {
  const cases: Array<{
    Corp: new () => ICorporationCard;
    symbol: string;
    money: number;
    production?: Partial<Units>;
    stock?: Partial<Units>;
    tr?: number;
    resources?: number;
  }> = [
    {Corp: PhoboLogRebalanced, symbol: 'PHOBOLOG_REBALANCED', money: 30, stock: {titanium: 8}},
    {Corp: PointLunaRebalanced, symbol: 'POINT_LUNA_REBALANCED', money: 48, production: {titanium: 1}},
    {Corp: PolyphemosRebalanced, symbol: 'POLYPHEMOS_REBALANCED', money: 55, production: {megacredits: 5}, stock: {titanium: 5}},
    {Corp: PoseidonRebalanced, symbol: 'POSEIDON_REBALANCED', money: 40},
    {Corp: PristarRebalanced, symbol: 'PRISTAR_REBALANCED', money: 53, tr: -2},
    {Corp: RecyclonRebalanced, symbol: 'RECYCLON_REBALANCED', money: 40, production: {steel: 2}, resources: 1},
    {Corp: RobinsonIndustriesRebalanced, symbol: 'ROBINSON_INDUSTRIES_REBALANCED', money: 40, production: {megacredits: 2}},
    {Corp: SpliceRebalanced, symbol: 'SPLICE_REBALANCED', money: 56},
    {Corp: StormCraftIncorporatedRebalanced, symbol: 'STORMCRAFT_INCORPORATED_REBALANCED', money: 50},
    {Corp: TerralabsResearchRebalanced, symbol: 'TERRALABS_RESEARCH_REBALANCED', money: 30, tr: -1},
    {Corp: TharsisRepublicRebalanced, symbol: 'THARSIS_REPUBLIC_REBALANCED', money: 40},
    {Corp: ThorgateRebalanced, symbol: 'THORGATE_REBALANCED', money: 40, production: {energy: 1}},
    {Corp: UnitedNationsMarsInitiativeRebalanced, symbol: 'UNITED_NATIONS_MARS_INITIATIVE_REBALANCED', money: 50},
    {Corp: UtopiaInvestRebalanced, symbol: 'UTOPIA_INVEST_REBALANCED', money: 48, production: {steel: 1, titanium: 1}},
    {Corp: VironRebalanced, symbol: 'VIRON_REBALANCED', money: 54},
    {Corp: VitorRebalanced, symbol: 'VITOR_REBALANCED', money: 52},
  ];

  for (const scenario of cases) {
    it(`starts ${scenario.symbol} with its published resources and self-trigger`, () => {
      const card = new scenario.Corp();
      const [game, player] = testGame(2, {coloniesExtension: true});
      player.production.override({});
      player.stock.override({});
      player.cardsInHand = [];
      const initialTR = player.terraformRating;
      player.playCorporationCard(card);
      runAllActions(game);

      expect(player.stock.asUnits()).deep.eq(Units.of({...scenario.stock, megacredits: scenario.money}));
      expect(player.production.asUnits()).deep.eq(Units.of(scenario.production ?? {}));
      expect(player.terraformRating).eq(initialTR + (scenario.tr ?? 0));
      expect(card.resourceCount).eq(scenario.resources ?? 0);
      expect(player.cardsInHand).has.length(0);
    });
  }

  it('matches the independent corporation catalogue', () => {
    expect(cases).has.length(16);
    for (const {Corp, symbol} of cases) {
      const card = new Corp();
      const expected = reference.cards.find((entry) => entry.symbol === symbol)!;
      expect(card.name, symbol).eq(expected.name);
      expect(card.type, symbol).eq(CardType.CORPORATION);
      expect(card.tags, symbol).deep.eq(expected.tags);
      expect(card.startingMegaCredits, symbol).eq(expected.startingMegaCredits);
      expect(card.metadata.cardNumber, symbol).eq(expected.texts[0]);
      // Normalize stale Splice text using independent starting resources.
      const expectedDescription = symbol === 'SPLICE_REBALANCED' ?
        expected.texts[1].replace('44 M€', `${expected.startingMegaCredits} M€`) : expected.texts[1];
      expect(card.metadata.description, symbol).eq(expectedDescription);
    }
  });

  it('draws two space cards as PhoboLog first action and improves titanium', () => {
    const card = new PhoboLogRebalanced();
    const [game, player] = testGame(2);
    const space1 = new SolarWindPower();
    const space2 = new Comet();
    const science = new SearchForLife();
    game.projectDeck.drawPile = [new Steelworks(), space1, space2, science];
    game.projectDeck.discardPile = [];
    card.play(player);
    player.defer(card.initialAction(player));
    runAllActions(game);
    expect(player.titanium).eq(8);
    expect(player.getTitaniumValue()).eq(4);
    expect(player.cardsInHand).has.members([space1, space2]);
    expect(game.projectDeck.discardPile).includes(science);
  });

  it('draws and discards for an Earth tag with Point Luna', () => {
    const card = new PointLunaRebalanced();
    const [game, player, other] = testGame(2);
    const held = new DustSeals();
    const drawn = new SearchForLife();
    player.playedCards.push(card);
    player.cardsInHand = [held];
    game.projectDeck.drawPile = [new Steelworks(), drawn];
    game.projectDeck.discardPile = [];
    player.onCardPlayed(new EarthCatapult());
    runAllActions(game);
    const waitingFor = player.popWaitingFor();
    expect(waitingFor).instanceOf(SelectCard);
    const discard = cast(waitingFor, SelectCard);
    expect(discard.toModel(player).min).eq(1);
    expect(discard.toModel(player).max).eq(1);
    discard.cb([held]);
    expect(player.cardsInHand).deep.eq([drawn]);
    expect(game.projectDeck.discardPile).includes(held);
    other.onCardPlayed(new EarthCatapult());
    runAllActions(game);
    expect(player.cardsInHand).deep.eq([drawn]);
    expect(player.popWaitingFor()).is.undefined;
  });

  it('draws for a basic cost of at least 20 with Polyphemos and keeps the 5 M€ card price', () => {
    const card = new PolyphemosRebalanced();
    const [game, player] = testGame(2);
    player.cardsInHand = [new DustSeals()];
    player.playCorporationCard(card);
    runAllActions(game);
    expect(player.cardCost).eq(5);
    expect(player.megaCredits).eq(50);
    player.cardsInHand = [];
    player.onCardPlayed(new Steelworks());
    runAllActions(game);
    expect(player.cardsInHand).has.length(0);
    const expensive = new MagneticFieldGenerators();
    expect(expensive.cost).eq(20);
    player.playedCards.push(new EarthCatapult());
    expect(player.getCardCost(expensive)).eq(18);
    player.onCardPlayed(expensive);
    runAllActions(game);
    expect(player.cardsInHand).has.length(1);
  });

  it('gives Poseidon two production only for its own colony', () => {
    const card = new PoseidonRebalanced();
    const [game, player, other] = testGame(2, {coloniesExtension: true});
    const io = new Io();
    const luna = new Luna();
    io.isActive = true;
    luna.isActive = true;
    game.colonies = [io, luna];
    player.production.override({});
    player.playedCards.push(card);
    luna.addColony(other);
    runAllActions(game);
    expect(player.production.megacredits).eq(0);
    io.addColony(player);
    runAllActions(game);
    expect(player.production.megacredits).eq(2);
    expect(player.production.heat).eq(1);
  });

  it('builds Poseidon first colony with the same owner bonus', () => {
    const card = new PoseidonRebalanced();
    const [game, player] = testGame(2, {coloniesExtension: true});
    const io = new Io();
    io.isActive = true;
    game.colonies = [io];
    player.production.override({});
    player.playedCards.push(card);
    player.defer(card.initialAction(player));
    runAllActions(game);
    cast(player.popWaitingFor(), SelectColony).cb(io);
    runAllActions(game);
    expect(io.colonies).deep.eq([player.id]);
    expect(player.production.megacredits).eq(2);
    expect(player.megaCredits).eq(0);
  });

  it('gives Pristar one influence only until TR is raised', () => {
    const card = new PristarRebalanced();
    const [game, player] = testGame(2, {turmoilExtension: true});
    const turmoil = game.turmoil!;
    const initialInfluence = turmoil.getInfluence(player);
    player.playedCards.push(card);
    expect(turmoil.getInfluence(player)).eq(initialInfluence + 1);
    card.onProductionPhase(player);
    expect(player.megaCredits).eq(6);
    expect(card.resourceCount).eq(1);
    expect(card.getVictoryPoints(player)).eq(1);
    expect(turmoil.getInfluence(player)).eq(initialInfluence + 1);
    player.increaseTerraformRating();
    expect(turmoil.getInfluence(player)).eq(initialInfluence);
    card.onProductionPhase(player);
    expect(player.megaCredits).eq(6);
    expect(card.resourceCount).eq(1);
  });

  it('keeps Pristar preservation effects and serialized state without Turmoil', () => {
    const card = new PristarRebalanced();
    const [game, player] = testGame(2);
    const initialTR = player.terraformRating;
    player.playedCards.push(card);
    card.play(player);
    runAllActions(game);
    expect(game.turmoil).is.undefined;
    expect(player.terraformRating).eq(initialTR - 2);
    card.onProductionPhase(player);
    card.onProductionPhase(player);
    expect(player.megaCredits).eq(12);
    expect(card.getVictoryPoints(player)).eq(2);
    expect(serializeCorporationCard(card)).deep.eq({name: 'Pristar(⚖)', resourceCount: 2, isDisabled: false});
  });

  it('converts two Recyclon microbes and serializes the remaining resources', () => {
    const card = new RecyclonRebalanced();
    const [game, player] = testGame(2);
    player.playCorporationCard(card);
    runAllActions(game);
    expect(card.resourceCount).eq(1);
    player.onCardPlayed(new Steelworks());
    runAllActions(game);
    expect(card.resourceCount).eq(2);
    const choice = cast(card.onCardPlayed(player, new Steelworks()), OrOptions);
    choice.options[0].cb();
    expect(card.resourceCount).eq(0);
    expect(player.production.plants).eq(1);
    expect(serializeCorporationCard(card)).deep.eq({name: 'Recyclon(⚖)', resourceCount: 0, isDisabled: false});
  });

  it('pays four to improve only Robinson lowest production', () => {
    const card = new RobinsonIndustriesRebalanced();
    const [game, player] = testGame(2);
    player.production.override({megacredits: 2, steel: 1, titanium: 1, plants: 1, energy: 1});
    player.megaCredits = 3;
    expect(card.canAct(player)).is.false;
    player.megaCredits = 4;
    expect(card.canAct(player)).is.true;
    const choice = cast(card.action(player), OrOptions);
    expect(choice.options).has.length(1);
    choice.options[0].cb();
    runAllActions(game);
    expect(player.megaCredits).eq(0);
    expect(player.production.heat).eq(1);
  });

  it('lets the active microbe-card player choose while rewarding Splice owner', () => {
    const card = new SpliceRebalanced();
    const [game, player, other] = testGame(2);
    const ants = new Ants();
    player.playedCards.push(card);
    other.playedCards.push(ants);
    other.onCardPlayed(ants);
    runAllActions(game);
    expect(other.megaCredits).eq(0);
    const choice = cast(other.popWaitingFor(), OrOptions);
    choice.options[0].cb();
    runAllActions(game);
    expect(player.megaCredits).eq(2);
    expect(ants.resourceCount).eq(1);
    expect(other.megaCredits).eq(0);
    player.defer(card.initialAction(player));
    runAllActions(game);
    expect(player.cardsInHand).has.length(1);
    expect(player.cardsInHand[0].tags).includes('microbe');
  });

  it('draws a floater-icon card that cannot store floaters as Stormcraft first action', () => {
    const card = new StormCraftIncorporatedRebalanced();
    const [game, player] = testGame(2);
    const technology = new FloaterTechnology();
    const science = new SearchForLife();
    game.projectDeck.drawPile = [new Steelworks(), technology, science];
    game.projectDeck.discardPile = [];
    player.defer(card.initialAction(player));
    runAllActions(game);
    expect(technology.resourceType).is.undefined;
    expect(player.cardsInHand).deep.eq([technology]);
    expect(game.projectDeck.discardPile).includes(science);
    expect(card.resourceType).is.undefined;
    expect('spendHeat' in card).is.false;
    expect(player.getPlayableActionCards()).not.includes(card);
  });

  it('splits three received floaters into one M€ and two energy', () => {
    const card = new StormCraftIncorporatedRebalanced();
    const [game, player, other] = testGame(2);
    const habs = new FloatingHabs();
    player.playedCards.push(card, habs);
    player.addResourceTo(habs, 3);
    runAllActions(game);
    const waitingFor = player.popWaitingFor();
    expect(waitingFor).instanceOf(AndOptions);
    const choice = cast(waitingFor, AndOptions);
    cast(choice.options[0], SelectAmount).cb(1);
    cast(choice.options[1], SelectAmount).cb(2);
    choice.cb(undefined);
    expect(habs.resourceCount).eq(3);
    expect(player.megaCredits).eq(1);
    expect(player.energy).eq(2);
    other.addResourceTo(new FloatingHabs(), 1);
    player.addResourceTo(new Ants(), 2);
    player.addResourceTo(habs, 0);
    runAllActions(game);
    expect(player.popWaitingFor()).is.undefined;
    expect(player.megaCredits).eq(1);
    expect(player.energy).eq(2);
  });

  it('rejects a Stormcraft split that does not match the received count', () => {
    const card = new StormCraftIncorporatedRebalanced();
    const [game, player] = testGame(2);
    const habs = new FloatingHabs();
    player.playedCards.push(card, habs);
    player.addResourceTo(habs, 3);
    runAllActions(game);
    const waitingFor = player.popWaitingFor();
    expect(waitingFor).instanceOf(AndOptions);
    const choice = cast(waitingFor, AndOptions);
    cast(choice.options[0], SelectAmount).cb(1);
    cast(choice.options[1], SelectAmount).cb(1);
    expect(() => choice.cb(undefined)).throws();
    expect(player.megaCredits).eq(0);
    expect(player.energy).eq(0);
  });

  it('preserves the original PhoboLog stock and Stormcraft heat ability', () => {
    const [game, player] = testGame(2);
    new PhoboLogRebalanced();
    new StormCraftIncorporatedRebalanced();
    new PhoboLog().play(player);
    runAllActions(game);
    expect(player.titanium).eq(10);
    const original = new StormCraftIncorporated();
    expect(original.resourceType).eq(CardResource.FLOATER);
    expect(original.spendHeat).a('function');
  });

  it('buys Terralabs starting cards for one M€ each', () => {
    const card = new TerralabsResearchRebalanced();
    const [game, player] = testGame(2);
    player.cardsInHand = [new DustSeals(), new Steelworks()];
    player.playCorporationCard(card);
    runAllActions(game);
    expect(player.cardCost).eq(1);
    expect(player.megaCredits).eq(28);
    expect(player.cardsInHand).has.length(2);
  });

  it('rewards Tharsis for every city including cities off Mars', () => {
    const card = new TharsisRepublicRebalanced();
    const [game, player, other] = testGame(2);
    player.playedCards.push(card);
    const offMars = game.board.spaces.find((space) => space.spaceType === SpaceType.COLONY)!;
    game.addTile(other, offMars, {tileType: TileType.CITY});
    runAllActions(game);
    expect(player.production.megacredits).eq(1);
    expect(player.megaCredits).eq(0);
    addCity(player);
    runAllActions(game);
    expect(player.production.megacredits).eq(2);
    expect(player.megaCredits).eq(3);
  });

  it('places Tharsis first city and keeps the solo neutral-city production', () => {
    const card = new TharsisRepublicRebalanced();
    const [game, player] = testGame(1);
    player.production.override({});
    player.playedCards.push(card);
    card.play(player);
    expect(player.production.megacredits).eq(2);
    player.defer(card.initialAction(player));
    runAllActions(game);
    assertPlaceCity(player, player.popWaitingFor());
    runAllActions(game);
    expect(player.production.megacredits).eq(3);
    expect(player.megaCredits).eq(3);
  });

  it('offers Thorgate action to trade one energy production for six M€', () => {
    const card = new ThorgateRebalanced();
    const [game, player] = testGame(2);
    player.playedCards.push(card);
    player.production.energy = 1;
    expect(player.getPlayableActionCards()).includes(card);
    cast(player.playActionCard(), SelectCard).cb([card]);
    runAllActions(game);
    expect(player.production.energy).eq(0);
    expect(player.megaCredits).eq(6);
    expect(card.canAct(player)).is.false;
  });

  it('keeps Thorgate power discounts and exposes the Kelvinists discount', () => {
    const card = new ThorgateRebalanced();
    const [/* game */, player] = testGame(2);
    player.playedCards.push(card);
    expect(player.getCardCost(new SolarWindPower())).eq(8);
    expect(new PowerPlantStandardProject().getAdjustedCost(player)).eq(8);
    expect(card.getPartyActionDiscount(player, PartyName.KELVINISTS)).eq(3);
    expect(card.getPartyActionDiscount(player, PartyName.REDS)).eq(0);
  });

  it('discounts HE3 Fusion Plant once despite two Power tags', () => {
    const [/* game */, player] = testGame(2, {moonExpansion: true});
    player.playedCards.push(new ThorgateRebalanced());
    const project = new HE3FusionPlant();
    expect(project.cost).eq(12);
    expect(project.tags.filter((tag) => tag === Tag.POWER)).has.length(2);
    expect(player.getCardCost(project)).eq(9);
  });

  it('pays one M€ for UNMI only after a TR gain', () => {
    const card = new UnitedNationsMarsInitiativeRebalanced();
    const [game, player] = testGame(2);
    player.megaCredits = 1;
    expect(card.canAct(player)).is.false;
    player.increaseTerraformRating();
    const initialTR = player.terraformRating;
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);
    expect(player.megaCredits).eq(0);
    expect(player.terraformRating).eq(initialTR + 1);
  });

  it('includes the Reds surcharge in UNMI action eligibility and payment', () => {
    const card = new UnitedNationsMarsInitiativeRebalanced();
    const [game, player] = testGame(2, {turmoilExtension: true});
    player.hasIncreasedTerraformRatingThisGeneration = true;
    setRulingParty(game, PartyName.REDS);
    player.megaCredits = 3;
    expect(card.canAct(player)).is.false;
    player.megaCredits = 4;
    expect(card.canAct(player)).is.true;
    const initialTR = player.terraformRating;
    card.action(player);
    runAllActions(game);
    expect(player.megaCredits).eq(0);
    expect(player.terraformRating).eq(initialTR + 1);
  });

  it('lets Utopia exchange a legal production for four matching resources', () => {
    const card = new UtopiaInvestRebalanced();
    const [game, player] = testGame(2);
    player.production.override({megacredits: -5, titanium: 1});
    expect(card.canAct(player)).is.true;
    const choice = cast(churn(card.action(player), player), OrOptions);
    expect(choice.options).has.length(1);
    choice.options[0].cb();
    runAllActions(game);
    expect(player.production.titanium).eq(0);
    expect(player.titanium).eq(4);
    expect(card.canAct(player)).is.false;
  });

  it('lets Viron repeat one previously used playable action', () => {
    const card = new VironRebalanced();
    const [game, player] = testGame(2);
    const tardigrades = new Tardigrades();
    player.playedCards.push(card, tardigrades);
    expect(card.canAct(player)).is.false;
    player.actionsThisGeneration.add(tardigrades.name);
    expect(card.canAct(player)).is.true;
    const choice = cast(card.action(player), SelectCard);
    expect(choice.cards).deep.eq([tardigrades]);
    player.defer(choice.cb([tardigrades]));
    runAllActions(game);
    expect(tardigrades.resourceCount).eq(1);
    player.actionsThisGeneration.add(card.name);
    expect(card.canAct(player)).is.false;
  });

  it('pays Vitor two only for non-negative VP-bearing cards, including a zero-score icon', () => {
    const card = new VitorRebalanced();
    const [/* game */, player] = testGame(2);
    card.onCardPlayed(player, card);
    card.onCardPlayed(player, new LavaFlows());
    expect(player.megaCredits).eq(0);
    card.onCardPlayed(player, new DustSeals());
    expect(player.megaCredits).eq(2);
    const ants = new Ants();
    expect(ants.getVictoryPoints(player)).eq(0);
    card.onCardPlayed(player, ants);
    expect(player.megaCredits).eq(4);
    const negative = new Hackers();
    expect(negative.getVictoryPoints(player)).eq(-1);
    card.onCardPlayed(player, negative);
    expect(player.megaCredits).eq(4);
  });

  it('funds Vitor award for free while skipping an already funded award', () => {
    const card = new VitorRebalanced();
    const [game, player, other] = testGame(2);
    game.fundAward(other, game.awards[0]);
    const choice = cast(card.initialAction(player), OrOptions);
    expect(choice.options).has.length(game.awards.length - 1);
    choice.options[0].cb();
    expect(game.hasBeenFunded(game.awards[1])).is.true;
    expect(player.megaCredits).eq(0);
    const [/* solo */, soloPlayer] = testGame(1);
    expect(card.initialAction(soloPlayer)).is.undefined;
  });
});
