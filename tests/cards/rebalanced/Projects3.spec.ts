import {expect} from 'chai';
import {Units} from '@/common/Units';
import {CardName} from '@/common/cards/CardName';
import {TileType} from '@/common/TileType';
import {SpaceType} from '@/common/boards/SpaceType';
import {SpaceName} from '@/common/boards/SpaceName';
import {MAX_TEMPERATURE, MAX_VENUS_SCALE} from '@/common/constants';
import {PartyName} from '@/common/turmoil/PartyName';
import {Payment} from '@/common/inputs/Payment';
import {cast} from '@/common/utils/utils';
import {IProjectCard} from '@/server/cards/IProjectCard';
import {RestrictedAreaRebalanced} from '@/server/cards/rebalanced/RestrictedAreaRebalanced';
import {RotatorImpactsRebalanced} from '@/server/cards/rebalanced/RotatorImpactsRebalanced';
import {SabotageRebalanced} from '@/server/cards/rebalanced/SabotageRebalanced';
import {SkyDocksRebalanced} from '@/server/cards/rebalanced/SkyDocksRebalanced';
import {SnowAlgaeRebalanced} from '@/server/cards/rebalanced/SnowAlgaeRebalanced';
import {SoilFactoryRebalanced} from '@/server/cards/rebalanced/SoilFactoryRebalanced';
import {SolarPowerRebalanced} from '@/server/cards/rebalanced/SolarPowerRebalanced';
import {SpinoffDepartmentRebalanced} from '@/server/cards/rebalanced/SpinoffDepartmentRebalanced';
import {StratopolisRebalanced} from '@/server/cards/rebalanced/StratopolisRebalanced';
import {StripMineRebalanced} from '@/server/cards/rebalanced/StripMineRebalanced';
import {TitanAirScrappingRebalanced} from '@/server/cards/rebalanced/TitanAirScrappingRebalanced';
import {TollStationRebalanced} from '@/server/cards/rebalanced/TollStationRebalanced';
import {TopsoilContractRebalanced} from '@/server/cards/rebalanced/TopsoilContractRebalanced';
import {TropicalResortRebalanced} from '@/server/cards/rebalanced/TropicalResortRebalanced';
import {UndergroundCityRebalanced} from '@/server/cards/rebalanced/UndergroundCityRebalanced';
import {UndergroundDetonationsRebalanced} from '@/server/cards/rebalanced/UndergroundDetonationsRebalanced';
import {ViralEnhancersRebalanced} from '@/server/cards/rebalanced/ViralEnhancersRebalanced';
import {WarpDriveRebalanced} from '@/server/cards/rebalanced/WarpDriveRebalanced';
import {ZeppelinsRebalanced} from '@/server/cards/rebalanced/ZeppelinsRebalanced';
import {AsteroidRights} from '@/server/cards/promo/AsteroidRights';
import {KuiperCooperative} from '@/server/cards/promo/KuiperCooperative';
import {MonsInsurance} from '@/server/cards/promo/MonsInsurance';
import {LunarSecurityStations} from '@/server/cards/moon/LunarSecurityStations';
import {Research} from '@/server/cards/base/Research';
import {SearchForLife} from '@/server/cards/base/SearchForLife';
import {EarthCatapult} from '@/server/cards/base/EarthCatapult';
import {Sponsors} from '@/server/cards/base/Sponsors';
import {SolarWindPower} from '@/server/cards/base/SolarWindPower';
import {MagneticFieldGenerators} from '@/server/cards/base/MagneticFieldGenerators';
import {Steelworks} from '@/server/cards/base/Steelworks';
import {Ants} from '@/server/cards/base/Ants';
import {Tardigrades} from '@/server/cards/base/Tardigrades';
import {EcologicalZone} from '@/server/cards/base/EcologicalZone';
import {FloatingHabs} from '@/server/cards/venusNext/FloatingHabs';
import {AerialMappers} from '@/server/cards/venusNext/AerialMappers';
import {ResearchCoordination} from '@/server/cards/prelude/ResearchCoordination';
import {SkyDocks} from '@/server/cards/colonies/SkyDocks';
import {Stratopolis} from '@/server/cards/venusNext/Stratopolis';
import {serializeProjectCard} from '@/server/cards/cardSerialization';
import {VenusPhase2Expansion} from '@/server/venusPhase2/VenusPhase2Expansion';
import {VENUS_STRATOPOLIS} from '@/server/venusPhase2/VenusSurfaceBoard';
import {SelectSpace} from '@/server/inputs/SelectSpace';
import {SelectCard} from '@/server/inputs/SelectCard';
import {SelectPayment} from '@/server/inputs/SelectPayment';
import {OrOptions} from '@/server/inputs/OrOptions';
import {testGame} from '../../TestGame';
import {addCity, addOcean, churn, runAllActions, setOxygenLevel, setRulingParty, setTemperature, setVenusScaleLevel} from '../../TestingUtils';
import {assertPlaceCity} from '../../assertions';
import reference from './reference.json';

describe('Rebalanced projects, group 3', () => {
  const cases: Array<{Card: new () => IProjectCard; symbol: string}> = [
    {Card: RestrictedAreaRebalanced, symbol: 'RESTRICTED_AREA_REBALANCED'},
    {Card: RotatorImpactsRebalanced, symbol: 'ROTATOR_IMPACTS_REBALANCED'},
    {Card: SabotageRebalanced, symbol: 'SABOTAGE_REBALANCED'},
    {Card: SkyDocksRebalanced, symbol: 'SKY_DOCKS_REBALANCED'},
    {Card: SnowAlgaeRebalanced, symbol: 'SNOW_ALGAE_REBALANCED'},
    {Card: SoilFactoryRebalanced, symbol: 'SOIL_FACTORY_REBALANCED'},
    {Card: SolarPowerRebalanced, symbol: 'SOLAR_POWER_REBALANCED'},
    {Card: SpinoffDepartmentRebalanced, symbol: 'SPINOFF_DEPARTMENT_REBALANCED'},
    {Card: StratopolisRebalanced, symbol: 'STRATOPOLIS_REBALANCED'},
    {Card: StripMineRebalanced, symbol: 'STRIP_MINE_REBALANCED'},
    {Card: TitanAirScrappingRebalanced, symbol: 'TITAN_AIRSCRAPPING_REBALANCED'},
    {Card: TollStationRebalanced, symbol: 'TOLL_STATION_REBALANCED'},
    {Card: TopsoilContractRebalanced, symbol: 'TOPSOIL_CONTRACT_REBALANCED'},
    {Card: TropicalResortRebalanced, symbol: 'TROPICAL_RESORT_REBALANCED'},
    {Card: UndergroundCityRebalanced, symbol: 'UNDERGROUND_CITY_REBALANCED'},
    {Card: UndergroundDetonationsRebalanced, symbol: 'UNDERGROUND_DETONATIONS_REBALANCED'},
    {Card: ViralEnhancersRebalanced, symbol: 'VIRAL_ENHANCERS_REBALANCED'},
    {Card: WarpDriveRebalanced, symbol: 'WARP_DRIVE_REBALANCED'},
    {Card: ZeppelinsRebalanced, symbol: 'ZEPPELINS_REBALANCED'},
  ];

  for (const {Card, symbol} of cases) {
    it(`uses the independent published price and tags for ${symbol}`, () => {
      const expected = reference.cards.find((entry) => entry.symbol === symbol)!;
      const card = new Card();
      expect(card.cost).eq(expected.cost);
      expect(card.tags).deep.eq(expected.tags);
      expect(card.type).eq(expected.type);
    });
  }

  it('matches the independent catalogue names and descriptions', () => {
    expect(cases).has.length(19);
    for (const {Card, symbol} of cases) {
      const expected = reference.cards.find((entry) => entry.symbol === symbol)!;
      const card = new Card();
      expect(card.name, symbol).eq(expected.name);
      expect(card.metadata.cardNumber, symbol).eq(expected.texts[0]);
      const description = card.metadata.description;
      if (description !== undefined) {
        expect(expected.texts, symbol).includes(typeof description === 'string' ? description : description.text);
      }
    }
  });

  const productionCases: Array<{Card: new () => IProjectCard; cost: number; initial?: Partial<Units>; result: Partial<Units>; vp: number}> = [
    {Card: SnowAlgaeRebalanced, cost: 11, result: {plants: 1, heat: 1}, vp: 0},
    {Card: SoilFactoryRebalanced, cost: 10, initial: {energy: 1}, result: {plants: 2}, vp: 1},
    {Card: SolarPowerRebalanced, cost: 10, result: {energy: 1}, vp: 1},
    {Card: SpinoffDepartmentRebalanced, cost: 13, result: {megacredits: 2}, vp: 0},
    {Card: TropicalResortRebalanced, cost: 11, initial: {heat: 2}, result: {megacredits: 3}, vp: 2},
  ];
  for (const scenario of productionCases) {
    it(`pays and applies published production for ${scenario.Card.name}`, () => {
      const card = new scenario.Card();
      const [game, player] = testGame(2);
      player.megaCredits = 50;
      player.production.override(scenario.initial ?? {});
      player.playCard(card, {...Payment.EMPTY, megacredits: scenario.cost});
      runAllActions(game);
      expect(player.megaCredits).eq(50 - scenario.cost);
      expect(player.production.asUnits()).deep.eq(Units.of(scenario.result));
      expect(card.getVictoryPoints(player)).eq(scenario.vp);
    });
  }

  it('keeps Snow Algae ocean and Soil Factory energy boundaries', () => {
    const [/* game */, player] = testGame(2);
    const snow = new SnowAlgaeRebalanced();
    addOcean(player);
    expect(snow.canPlay(player)).is.false;
    addOcean(player);
    expect(snow.canPlay(player)).is.true;
    const soil = new SoilFactoryRebalanced();
    expect(soil.canPlay(player)).is.false;
    player.production.energy = 1;
    expect(soil.canPlay(player)).is.true;
  });

  it('places Restricted Area and pays two M€ to draw one card', () => {
    const card = new RestrictedAreaRebalanced();
    const [game, player] = testGame(2);
    player.playCard(card);
    runAllActions(game);
    const placement = cast(player.popWaitingFor(), SelectSpace);
    const space = placement.spaces[0];
    placement.cb(space);
    runAllActions(game);
    expect(space.tile?.tileType).eq(TileType.RESTRICTED_AREA);
    expect(space.adjacency).is.undefined;
    player.cardsInHand = [];
    player.megaCredits = 1;
    expect(card.canAct(player)).is.false;
    player.megaCredits = 2;
    card.action(player);
    runAllActions(game);
    expect(player.megaCredits).eq(0);
    expect(player.cardsInHand).has.length(1);
  });

  it('requires Sabotage generation five at the four/five/six boundary', () => {
    const card = new SabotageRebalanced();
    const [game, player] = testGame(2);
    for (const [generation, playable] of [[4, false], [5, true], [6, true]] as const) {
      game.generation = generation;
      expect(card.canPlay(player), String(generation)).eq(playable);
    }
  });

  it('limits Sabotage to one opponent loss with capped amounts and a decline', () => {
    const card = new SabotageRebalanced();
    const [game, player, other] = testGame(2);
    player.stock.override({titanium: 5, steel: 5, megacredits: 8});
    other.stock.override({titanium: 2, steel: 5, megacredits: 8});
    const choice = cast(card.play(player), OrOptions);
    expect(choice.options).has.length(4);
    choice.options[0].cb();
    runAllActions(game);
    expect(other.stock.asUnits()).deep.eq(Units.of({steel: 5, megacredits: 8}));
    expect(player.stock.asUnits()).deep.eq(Units.of({titanium: 5, steel: 5, megacredits: 8}));
    const declined = cast(card.play(player), OrOptions);
    declined.options[declined.options.length - 1].cb();
    runAllActions(game);
    expect(other.stock.asUnits()).deep.eq(Units.of({steel: 5, megacredits: 8}));
  });

  it('respects Sabotage alloy protection and removes seven M€', () => {
    const card = new SabotageRebalanced();
    const [game, player, other] = testGame(2);
    other.playedCards.push(new LunarSecurityStations());
    other.stock.override({titanium: 3, steel: 4, megacredits: 8});
    const choice = cast(card.play(player), OrOptions);
    expect(choice.options).has.length(2);
    choice.options[0].cb();
    runAllActions(game);
    expect(other.stock.asUnits()).deep.eq(Units.of({titanium: 3, steel: 4, megacredits: 1}));
  });

  it('removes four Sabotage steel from only the selected opponent', () => {
    const card = new SabotageRebalanced();
    const [game, player, other, third] = testGame(3);
    other.steel = 5;
    third.steel = 6;
    const choice = cast(card.play(player), OrOptions);
    expect(choice.options).has.length(3);
    choice.options[0].cb();
    runAllActions(game);
    expect(other.steel).eq(1);
    expect(third.steel).eq(6);
  });

  it('does nothing with Sabotage in solo, including neutral Mons Insurance', () => {
    const card = new SabotageRebalanced();
    const [game, player] = testGame(1);
    player.playedCards.push(new MonsInsurance());
    game.monsInsuranceOwner = player;
    player.megaCredits = 10;
    expect(card.play(player)).is.undefined;
    runAllActions(game);
    expect(player.megaCredits).eq(10);
  });

  it('requires two Earth tags for Sky Docks and keeps fleet, discount and one VP', () => {
    const card = new SkyDocksRebalanced();
    const [game, player] = testGame(2, {coloniesExtension: true});
    player.playedCards.push(new Sponsors());
    expect(card.canPlay(player)).is.false;
    player.playedCards.push(new EarthCatapult());
    expect(card.canPlay(player)).is.true;
    card.play(player);
    runAllActions(game);
    expect(player.colonies.getFleetSize()).eq(2);
    expect(card.getCardDiscount(player, new Research())).eq(1);
    expect(card.getVictoryPoints(player)).eq(1);
    expect(card.metadata.victoryPoints).eq(1);
    card.onDiscard(player);
    expect(player.colonies.getFleetSize()).eq(1);
  });

  it('draws Spinoff cards by basic price, including a discounted twenty-cost card', () => {
    const card = new SpinoffDepartmentRebalanced();
    const [game, player] = testGame(2);
    player.playedCards.push(card, new EarthCatapult());
    player.onCardPlayed(new Steelworks());
    runAllActions(game);
    expect(player.cardsInHand).has.length(0);
    const expensive = new MagneticFieldGenerators();
    expect(expensive.cost).eq(20);
    expect(player.getCardCost(expensive)).eq(18);
    player.onCardPlayed(expensive);
    runAllActions(game);
    expect(player.cardsInHand).has.length(1);
  });

  for (const venusPhase2Expansion of [false, true]) {
    it(`places Stratopolis on its canonical reserved board, Venus Phase 2=${venusPhase2Expansion}`, () => {
      const card = new StratopolisRebalanced();
      const [game, player] = testGame(2, {venusNextExtension: true, venusPhase2Expansion});
      expect(card.canPlay(player)).is.false;
      player.playedCards.push(new Research());
      expect(card.canPlay(player)).is.true;
      player.playCard(card);
      runAllActions(game);
      const space = venusPhase2Expansion ?
        VenusPhase2Expansion.venusPhase2Data(game).venusSurface.getSpaceOrThrow(VENUS_STRATOPOLIS) :
        game.board.getSpaceOrThrow(SpaceName.STRATOPOLIS);
      expect(space.tile?.tileType).eq(TileType.CITY);
      expect(space.tile?.card).eq(CardName.STRATOPOLIS_REBALANCED);
      expect(player.production.megacredits).eq(2);
      expect(new StratopolisRebalanced().canPlay(player)).is.false;
    });
  }

  it('adds Stratopolis floaters only to Venus cards and scores every two here', () => {
    const card = new StratopolisRebalanced();
    const [game, player] = testGame(2);
    const venus = new AerialMappers();
    const other = new TitanAirScrappingRebalanced();
    player.playedCards.push(card, venus, other);
    const choice = cast(churn(card.action(player), player), SelectCard);
    expect(choice.cards).has.members([card, venus]);
    expect(choice.cards).not.includes(other);
    choice.cb([venus]);
    runAllActions(game);
    expect(venus.resourceCount).eq(2);
    card.resourceCount = 5;
    expect(card.getVictoryPoints(player)).eq(2);
    expect(card.metadata.victoryPoints).includes({points: 1, target: 2});
    expect(serializeProjectCard(card)).includes({name: CardName.STRATOPOLIS_REBALANCED, resourceCount: 5});
  });

  it('spends Strip Mine energy and raises oxygen twice while paying the Reds tax', () => {
    const card = new StripMineRebalanced();
    const [game, player] = testGame(2, {turmoilExtension: true});
    setRulingParty(game, PartyName.REDS);
    player.production.energy = 1;
    player.megaCredits = 29;
    expect(player.canPlay(card)).is.false;
    player.production.energy = 2;
    player.megaCredits = 28;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = 29;
    expect(player.canPlay(card)).is.true;
    const initialTR = player.terraformRating;
    player.playCard(card, {...Payment.EMPTY, megacredits: 23});
    runAllActions(game);
    expect(player.production.asUnits()).deep.eq(Units.of({steel: 2, titanium: 1}));
    expect(game.getOxygenLevel()).eq(2);
    expect(player.terraformRating).eq(initialTR + 2);
    expect(player.megaCredits).eq(0);
  });

  it('spends one titanium for four Titan floaters, then two floaters for one TR', () => {
    const card = new TitanAirScrappingRebalanced();
    const [game, player] = testGame(2);
    player.playedCards.push(card);
    expect(card.canAct(player)).is.false;
    player.titanium = 1;
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);
    expect(player.titanium).eq(0);
    expect(card.resourceCount).eq(4);
    const initialTR = player.terraformRating;
    card.action(player);
    runAllActions(game);
    expect(card.resourceCount).eq(2);
    expect(player.terraformRating).eq(initialTR + 1);
    expect(card.getVictoryPoints(player)).eq(2);
    expect(serializeProjectCard(card)).includes({name: CardName.TITAN_AIRSCRAPPING_REBALANCED, resourceCount: 2});
  });

  it('requires the Reds payment before consuming Titan floaters', () => {
    const card = new TitanAirScrappingRebalanced();
    const [game, player] = testGame(2, {turmoilExtension: true});
    setRulingParty(game, PartyName.REDS);
    card.resourceCount = 2;
    player.megaCredits = 2;
    expect(card.canAct(player)).is.false;
    expect(card.resourceCount).eq(2);
    player.megaCredits = 3;
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);
    expect(card.resourceCount).eq(0);
    expect(player.megaCredits).eq(0);
  });

  it('uses the highest one-opponent Space count for Toll Station without Wild tags', () => {
    const card = new TollStationRebalanced();
    const [game, player, other, third] = testGame(3);
    player.playedCards.push(new KuiperCooperative());
    other.playedCards.push(new SolarWindPower(), new ResearchCoordination());
    third.playedCards.push(new SolarWindPower(), new AsteroidRights(), new ResearchCoordination());
    card.play(player);
    runAllActions(game);
    expect(player.production.megacredits).eq(2);
    const [soloGame, solo] = testGame(1);
    card.play(solo);
    runAllActions(soloGame);
    expect(solo.production.megacredits).eq(0);
  });

  it('gains Topsoil plants and income only for its own gained microbes', () => {
    const card = new TopsoilContractRebalanced();
    const [game, player, other] = testGame(2);
    player.playCard(card);
    runAllActions(game);
    expect(player.plants).eq(3);
    const tardigrades = new Tardigrades();
    player.playedCards.push(tardigrades);
    player.addResourceTo(tardigrades, 3);
    other.addResourceTo(new Ants(), 2);
    player.addResourceTo(new FloatingHabs(), 2);
    runAllActions(game);
    expect(player.megaCredits).eq(3);
    expect(tardigrades.resourceCount).eq(3);
  });

  it('requires heat production before exchanging it with Tropical Resort', () => {
    const card = new TropicalResortRebalanced();
    const [/* game */, player] = testGame(2);
    player.production.heat = 1;
    expect(card.canPlay(player)).is.false;
    player.production.heat = 2;
    expect(card.canPlay(player)).is.true;
  });

  it('places Underground City using one energy production and gains two steel production', () => {
    const card = new UndergroundCityRebalanced();
    const [game, player] = testGame(2);
    expect(card.canPlay(player)).is.false;
    player.production.energy = 1;
    expect(card.canPlay(player)).is.true;
    player.playCard(card);
    runAllActions(game);
    const space = assertPlaceCity(player, player.popWaitingFor());
    runAllActions(game);
    expect(space.tile?.tileType).eq(TileType.CITY);
    expect(player.production.asUnits()).deep.eq(Units.of({steel: 2}));
  });

  it('pays eight with steel for Underground Detonations before gaining heat production', () => {
    const card = new UndergroundDetonationsRebalanced();
    const [game, player] = testGame(2);
    player.steel = 3;
    expect(card.canAct(player)).is.false;
    player.steel = 4;
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);
    const payment = cast(player.popWaitingFor(), SelectPayment);
    expect(player.production.heat).eq(0);
    payment.cb({...Payment.EMPTY, steel: 4});
    runAllActions(game);
    expect(player.steel).eq(0);
    expect(player.production.heat).eq(2);
  });

  it('gives Viral Enhancers its self plant and one choice per biological tag', () => {
    const card = new ViralEnhancersRebalanced();
    const [game, player, other] = testGame(2);
    player.playCard(card);
    runAllActions(game);
    expect(player.plants).eq(1);
    const zone = new EcologicalZone();
    player.playedCards.push(zone);
    player.defer(card.onCardPlayed(player, zone));
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[0].cb();
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[1].cb();
    runAllActions(game);
    expect(zone.resourceCount).eq(1);
    expect(player.plants).eq(2);
    other.onCardPlayed(new Ants());
    runAllActions(game);
    expect(player.plants).eq(2);
  });

  it('requires five Science tags and discounts a Space card once even with two Space tags', () => {
    const card = new WarpDriveRebalanced();
    const [/* game */, player] = testGame(2);
    player.playedCards.push(new Research(), new SearchForLife(), new ViralEnhancersRebalanced());
    expect(card.canPlay(player)).is.false;
    player.playedCards.push(new SolarWindPower());
    expect(card.canPlay(player)).is.true;
    expect(card.getCardDiscount(player, new KuiperCooperative())).eq(4);
    player.playedCards.push(card);
    expect(player.getCardCost(new SolarWindPower())).eq(7);
    expect(player.getCardCost(new Research())).eq(11);
    expect(card.getVictoryPoints(player)).eq(2);
  });

  it('counts only Mars cities for Zeppelins after five percent oxygen', () => {
    const card = new ZeppelinsRebalanced();
    const [game, player, other] = testGame(2);
    setOxygenLevel(game, 4);
    expect(card.canPlay(player)).is.false;
    setOxygenLevel(game, 5);
    expect(card.canPlay(player)).is.true;
    addCity(player);
    addCity(other);
    const offMars = game.board.spaces.find((space) => space.spaceType === SpaceType.COLONY)!;
    game.addTile(other, offMars, {tileType: TileType.CITY});
    card.play(player);
    runAllActions(game);
    expect(player.production.megacredits).eq(2);
    expect(card.getVictoryPoints(player)).eq(1);
  });

  it('pays six with titanium to buy a Rotator asteroid on another owned card', () => {
    const card = new RotatorImpactsRebalanced();
    const [game, player, other] = testGame(2, {venusNextExtension: true});
    const rights = new AsteroidRights();
    const opponent = new AsteroidRights();
    player.playedCards.push(card, rights);
    other.playedCards.push(opponent);
    player.titanium = 2;
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);
    cast(player.popWaitingFor(), SelectPayment).cb({...Payment.EMPTY, titanium: 2});
    runAllActions(game);
    const choice = cast(player.popWaitingFor(), SelectCard);
    expect(choice.cards).has.members([card, rights]);
    expect(choice.cards).not.includes(opponent);
    choice.cb([rights]);
    runAllActions(game);
    expect(player.titanium).eq(0);
    expect(rights.resourceCount).eq(1);
    expect(card.resourceCount).eq(0);
    expect(opponent.resourceCount).eq(0);
  });

  it('checks Rotator Venus fourteen requirement and consumes one asteroid for Venus', () => {
    const card = new RotatorImpactsRebalanced();
    const [game, player] = testGame(2, {venusNextExtension: true});
    setVenusScaleLevel(game, 16);
    expect(card.canPlay(player)).is.false;
    setVenusScaleLevel(game, 14);
    expect(card.canPlay(player)).is.true;
    setVenusScaleLevel(game, 10);
    player.playedCards.push(card);
    card.resourceCount = 1;
    const initialTR = player.terraformRating;
    expect(card.canAct(player)).is.true;
    player.defer(card.action(player));
    runAllActions(game);
    expect(card.resourceCount).eq(0);
    expect(game.getVenusScaleLevel()).eq(12);
    expect(player.terraformRating).eq(initialTR + 1);
    expect(serializeProjectCard(card)).includes({name: CardName.ROTATOR_IMPACTS_REBALANCED, resourceCount: 0});
  });

  it('does not consume a Rotator asteroid at Venus cap, but can still buy another', () => {
    const card = new RotatorImpactsRebalanced();
    const [game, player] = testGame(2, {venusNextExtension: true, turmoilExtension: true});
    setRulingParty(game, PartyName.REDS);
    setVenusScaleLevel(game, MAX_VENUS_SCALE);
    player.playedCards.push(card);
    card.resourceCount = 1;
    expect(card.canAct(player)).is.false;
    player.megaCredits = 6;
    expect(card.canAct(player)).is.true;
    player.defer(card.action(player));
    runAllActions(game);
    expect(card.resourceCount).eq(2);
    expect(player.megaCredits).eq(0);
    expect(game.getVenusScaleLevel()).eq(MAX_VENUS_SCALE);
  });

  it('charges Rotator Reds tax for Venus even when temperature is capped', () => {
    const card = new RotatorImpactsRebalanced();
    const [game, player] = testGame(2, {venusNextExtension: true, turmoilExtension: true});
    setRulingParty(game, PartyName.REDS);
    setTemperature(game, MAX_TEMPERATURE);
    setVenusScaleLevel(game, 14);
    player.playedCards.push(card);
    card.resourceCount = 1;
    player.megaCredits = 0;
    expect(card.canAct(player)).is.false;
    expect(card.resourceCount).eq(1);
    player.megaCredits = 3;
    expect(card.canAct(player)).is.false;
    player.megaCredits = 6;
    expect(card.canAct(player)).is.true;
    cast(churn(card.action(player), player), OrOptions).options[0].cb();
    runAllActions(game);
    expect(card.resourceCount).eq(0);
    expect(player.megaCredits).eq(0);
    expect(game.getVenusScaleLevel()).eq(16);
  });

  it('allows the six-M€ Rotator purchase under Reds without charging Venus tax', () => {
    const card = new RotatorImpactsRebalanced();
    const [game, player] = testGame(2, {venusNextExtension: true, turmoilExtension: true});
    setRulingParty(game, PartyName.REDS);
    player.playedCards.push(card);
    player.megaCredits = 6;
    expect(card.canAct(player)).is.true;
    player.defer(card.action(player));
    runAllActions(game);
    expect(card.resourceCount).eq(1);
    expect(player.megaCredits).eq(0);
    expect(game.getVenusScaleLevel()).eq(0);
  });

  it('preserves original Sky Docks and Stratopolis cached victory points', () => {
    new SkyDocksRebalanced();
    new StratopolisRebalanced();
    const [/* game */, player] = testGame(2);
    expect(new SkyDocks().getVictoryPoints(player)).eq(2);
    const original = new Stratopolis();
    original.resourceCount = 5;
    expect(original.getVictoryPoints(player)).eq(1);
  });
});
