import {expect} from 'chai';
import {AdaptedLichenRebalanced} from '@/server/cards/rebalanced/AdaptedLichenRebalanced';
import {AdvancedAlloysRebalanced} from '@/server/cards/rebalanced/AdvancedAlloysRebalanced';
import {AerobrakedAmmoniaAsteroidRebalanced} from '@/server/cards/rebalanced/AerobrakedAmmoniaAsteroidRebalanced';
import {AsteroidHollowingRebalanced} from '@/server/cards/rebalanced/AsteroidHollowingRebalanced';
import {AsteroidMiningConsortiumRebalanced} from '@/server/cards/rebalanced/AsteroidMiningConsortiumRebalanced';
import {BactoviralResearchRebalanced} from '@/server/cards/rebalanced/BactoviralResearchRebalanced';
import {BlackPolarDustRebalanced} from '@/server/cards/rebalanced/BlackPolarDustRebalanced';
import {BuildingIndustriesRebalanced} from '@/server/cards/rebalanced/BuildingIndustriesRebalanced';
import {CartelRebalanced} from '@/server/cards/rebalanced/CartelRebalanced';
import {CloudSeedingRebalanced} from '@/server/cards/rebalanced/CloudSeedingRebalanced';
import {CommunityServicesRebalanced} from '@/server/cards/rebalanced/CommunityServicesRebalanced';
import {CorporateStrongholdRebalanced} from '@/server/cards/rebalanced/CorporateStrongholdRebalanced';
import {CuttingEdgeTechnologyRebalanced} from '@/server/cards/rebalanced/CuttingEdgeTechnologyRebalanced';
import {DeimosDownPromoRebalanced} from '@/server/cards/rebalanced/DeimosDownPromoRebalanced';
import {DesignedMicroOrganismsRebalanced} from '@/server/cards/rebalanced/DesignedMicroOrganismsRebalanced';
import {EarthCatapultRebalanced} from '@/server/cards/rebalanced/EarthCatapultRebalanced';
import {EarthOfficeRebalanced} from '@/server/cards/rebalanced/EarthOfficeRebalanced';
import {EnergyMarketRebalanced} from '@/server/cards/rebalanced/EnergyMarketRebalanced';
import {EnergySavingRebalanced} from '@/server/cards/rebalanced/EnergySavingRebalanced';
import {EnergyTappingRebalanced} from '@/server/cards/rebalanced/EnergyTappingRebalanced';
import {IProjectCard} from '@/server/cards/IProjectCard';
import {Tag} from '@/common/cards/Tag';
import {Resource} from '@/common/Resource';
import {cast} from '@/common/utils/utils';
import {SelectCard} from '@/server/inputs/SelectCard';
import {SelectPlayer} from '@/server/inputs/SelectPlayer';
import {SelectSpace} from '@/server/inputs/SelectSpace';
import {SelectAmount} from '@/server/inputs/SelectAmount';
import {OrOptions} from '@/server/inputs/OrOptions';
import {AdaptationTechnology} from '@/server/cards/base/AdaptationTechnology';
import {Tardigrades} from '@/server/cards/base/Tardigrades';
import {GHGProducingBacteria} from '@/server/cards/base/GHGProducingBacteria';
import {Research} from '@/server/cards/base/Research';
import {ProtectedHabitats} from '@/server/cards/base/ProtectedHabitats';
import {TileType} from '@/common/TileType';
import {CardType} from '@/common/cards/CardType';
import {Warmonger} from '@/server/awards/terraCimmeria/Warmonger';
import {AmazonisEngineer} from '@/server/awards/amazonisPlanitia/AmazonisEngineer';
import {testGame} from '../../TestGame';
import {runAllActions, fakeCard, maxOutOceans, setTemperature} from '../../TestingUtils';

describe('Rebalanced projects, group 1', () => {
  const cards: ReadonlyArray<[new () => IProjectCard, number, Array<Tag>, number]> = [
    [AdaptedLichenRebalanced, 8, [Tag.PLANT], 0],
    [AdvancedAlloysRebalanced, 9, [], 0],
    [AerobrakedAmmoniaAsteroidRebalanced, 26, [Tag.SPACE], 0],
    [AsteroidHollowingRebalanced, 16, [Tag.SPACE], 2],
    [AsteroidMiningConsortiumRebalanced, 13, [Tag.JOVIAN], 1],
    [BactoviralResearchRebalanced, 10, [Tag.MICROBE, Tag.SCIENCE], 0],
    [BlackPolarDustRebalanced, 14, [], 0],
    [BuildingIndustriesRebalanced, 5, [Tag.BUILDING], 0],
    [CartelRebalanced, 10, [Tag.EARTH], 0],
    [CloudSeedingRebalanced, 11, [Tag.PLANT], 0],
    [CommunityServicesRebalanced, 11, [], 1],
    [CorporateStrongholdRebalanced, 11, [Tag.CITY, Tag.BUILDING], -1],
    [CuttingEdgeTechnologyRebalanced, 14, [Tag.SCIENCE], 1],
    [DeimosDownPromoRebalanced, 35, [Tag.SPACE], 0],
    [DesignedMicroOrganismsRebalanced, 15, [Tag.SCIENCE, Tag.MICROBE], 0],
    [EarthCatapultRebalanced, 28, [Tag.EARTH], 1],
    [EarthOfficeRebalanced, 4, [Tag.EARTH], 0],
    [EnergyMarketRebalanced, 5, [Tag.POWER], 0],
    [EnergySavingRebalanced, 15, [Tag.POWER, Tag.BUILDING], 0],
    [EnergyTappingRebalanced, 3, [Tag.POWER], -1],
  ];
  for (const [Factory, cost, tags, vp] of cards) {
    it(`${Factory.name} has the published cost, tags and victory points`, () => {
      const [, player] = testGame(2);
      const card = new Factory();
      card.resourceCount = 2;
      expect(card.cost).eq(cost);
      expect(card.tags).deep.eq(tags);
      expect(card.getVictoryPoints(player)).eq(vp);
    });
  }

  for (const [Factory, generation, resource] of [
    [AsteroidMiningConsortiumRebalanced, 4, Resource.TITANIUM],
    [EnergyTappingRebalanced, 6, Resource.ENERGY],
  ] as const) {
    it(`${Factory.name} rejects the preceding generation even with own production`, () => {
      const [game, player] = testGame(2);
      player.production.add(resource, 1);
      game.generation = generation - 1;
      expect(new Factory().canPlay(player)).is.false;
    });
    it(`${Factory.name} honors N-1, N and N+1 with no own production and no adaptation offset`, () => {
      const [game, player] = testGame(2);
      player.playedCards.push(new AdaptationTechnology());
      const card: IProjectCard = new Factory();
      expect(card.requirements[0].count).eq(generation);
      for (const [value, expected] of [[generation - 1, false], [generation, true], [generation + 1, true]] as const) {
        game.generation = value;
        expect(card.canPlay(player)).eq(expected);
      }
      expect(Warmonger.autoInclude(card)).is.true;
      expect(AmazonisEngineer.autoInclude(card)).is.true;
    });
    it(`${Factory.name} gains production before selecting any target, including itself`, () => {
      const [game, player, other] = testGame(2);
      game.generation = generation;
      const card = new Factory();
      expect(card.canPlay(player)).is.true;
      card.play(player);
      runAllActions(game);
      expect(player.production.get(resource)).eq(1);
      cast(player.popWaitingFor(), SelectPlayer).cb(player);
      runAllActions(game);
      expect(player.production.get(resource)).eq(0);
      other.production.add(resource, 1);
      card.play(player);
      runAllActions(game);
      cast(player.popWaitingFor(), SelectPlayer).cb(other);
      runAllActions(game);
      expect(player.production.get(resource)).eq(1);
      expect(other.production.get(resource)).eq(0);
    });
  }

  it('published action and event card types retain their engine roles', () => {
    for (const Factory of [AdvancedAlloysRebalanced, AsteroidHollowingRebalanced, CuttingEdgeTechnologyRebalanced, EarthCatapultRebalanced, EarthOfficeRebalanced, EnergyMarketRebalanced]) {
      expect(new Factory().type).eq(CardType.ACTIVE);
    }
    for (const Factory of [AerobrakedAmmoniaAsteroidRebalanced, DeimosDownPromoRebalanced]) {
      expect(new Factory().type).eq(CardType.EVENT);
    }
    for (const Factory of [AdaptedLichenRebalanced, AsteroidMiningConsortiumRebalanced, BactoviralResearchRebalanced, BlackPolarDustRebalanced, BuildingIndustriesRebalanced, CartelRebalanced, CloudSeedingRebalanced, CommunityServicesRebalanced, CorporateStrongholdRebalanced, DesignedMicroOrganismsRebalanced, EnergySavingRebalanced, EnergyTappingRebalanced]) {
      expect(new Factory().type).eq(CardType.AUTOMATED);
    }
  });

  it('Aerobraked Ammonia Asteroid gains four heat production and three microbes', () => {
    const [game, player] = testGame(2);
    const microbes = new Tardigrades();
    player.playedCards.push(microbes);
    new AerobrakedAmmoniaAsteroidRebalanced().play(player);
    runAllActions(game);
    expect(player.production.heat).eq(4);
    expect(player.production.plants).eq(1);
    expect(microbes.resourceCount).eq(3);
  });

  it('Asteroid Hollowing spends titanium, gains production and scores every asteroid', () => {
    const [game, player] = testGame(2);
    const card = new AsteroidHollowingRebalanced();
    expect(card.canAct(player)).is.false;
    player.titanium = 1;
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);
    expect(player.titanium).eq(0);
    expect(player.production.megacredits).eq(1);
    expect(card.resourceCount).eq(1);
    expect(card.getVictoryPoints(player)).eq(1);
  });

  it('Bactoviral Research counts microbes, including itself, instead of science tags', () => {
    const [game, player] = testGame(2);
    const target = new Tardigrades();
    player.playedCards.push(target, new GHGProducingBacteria(), new Research());
    new BactoviralResearchRebalanced().play(player);
    runAllActions(game);
    cast(player.popWaitingFor(), SelectCard).cb([target]);
    expect(player.cardsInHand).has.length(1);
    expect(target.resourceCount).eq(3);
  });

  it('Deimos Down removes eight plants, raises temperature, gains steel and places its tile', () => {
    const [game, player, other] = testGame(2);
    other.plants = 10;
    new DeimosDownPromoRebalanced().play(player);
    runAllActions(game);
    const tile = cast(player.popWaitingFor(), SelectSpace);
    const space = tile.spaces[0];
    space.bonus = [];
    tile.cb(space);
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[0].cb();
    expect(other.plants).eq(2);
    expect(player.steel).eq(4);
    expect(game.getTemperature()).eq(-24);
    expect(space.tile?.tileType).eq(TileType.DEIMOS_DOWN);
  });

  it('Advanced Alloys raises both metal payment values and reverses them on discard', () => {
    const [, player] = testGame(2);
    const card = new AdvancedAlloysRebalanced();
    card.play(player);
    expect(player.getSteelValue()).eq(3);
    expect(player.getTitaniumValue()).eq(4);
    card.onDiscard(player);
    expect(player.getSteelValue()).eq(2);
    expect(player.getTitaniumValue()).eq(3);
  });

  it('Adapted Lichen and Building Industries retain their production effects and production gate', () => {
    const [, player] = testGame(2);
    new AdaptedLichenRebalanced().play(player);
    expect(player.production.plants).eq(1);
    const building = new BuildingIndustriesRebalanced();
    expect(building.canPlay(player)).is.false;
    player.production.add(Resource.ENERGY, 1);
    expect(building.canPlay(player)).is.true;
    building.play(player);
    expect(player.production.energy).eq(0);
    expect(player.production.steel).eq(2);
  });

  it('Black Polar Dust checks the production floor and grants an ocean and heat production', () => {
    const [game, player] = testGame(2);
    const card = new BlackPolarDustRebalanced();
    player.production.add(Resource.MEGACREDITS, -4);
    expect(card.canPlay(player)).is.false;
    player.production.add(Resource.MEGACREDITS, 1);
    expect(card.canPlay(player)).is.true;
    card.play(player);
    runAllActions(game);
    const ocean = cast(player.popWaitingFor(), SelectSpace);
    ocean.cb(ocean.spaces[0]);
    expect(game.board.getOceanSpaces()).has.length(1);
    expect(player.production.megacredits).eq(-5);
    expect(player.production.heat).eq(3);
  });

  it('Cartel and Community Services count their own tags or absence of tags', () => {
    const [, player] = testGame(2);
    player.playedCards.push(new EarthOfficeRebalanced());
    new CartelRebalanced().play(player);
    expect(player.production.megacredits).eq(2);
    player.playedCards.push(new AdvancedAlloysRebalanced());
    new CommunityServicesRebalanced().play(player);
    expect(player.production.megacredits).eq(4);
  });

  it('Cloud Seeding requires oceans and a heat target, reduces costs and gains plants', () => {
    const [game, player, other] = testGame(2);
    const card = new CloudSeedingRebalanced();
    other.production.add(Resource.HEAT, 1);
    expect(card.canPlay(player)).is.false;
    maxOutOceans(player, 3);
    expect(card.canPlay(player)).is.true;
    card.play(player);
    runAllActions(game);
    expect(player.production.plants).eq(2);
    expect(player.production.megacredits).eq(-1);
    expect(other.production.heat).eq(0);
  });

  it('Corporate Stronghold places a city and exchanges energy production for money production', () => {
    const [game, player] = testGame(2);
    const card = new CorporateStrongholdRebalanced();
    expect(card.canPlay(player)).is.false;
    player.production.add(Resource.ENERGY, 1);
    expect(card.canPlay(player)).is.true;
    card.play(player);
    runAllActions(game);
    const city = cast(player.popWaitingFor(), SelectSpace);
    city.cb(city.spaces[0]);
    expect(player.production.energy).eq(0);
    expect(player.production.megacredits).eq(3);
    expect(city.spaces[0].tile?.tileType).eq(TileType.CITY);
  });

  it('Cutting Edge, Earth Catapult and Earth Office retain their distinct discounts', () => {
    const [, player] = testGame(2);
    player.playedCards.push(new CuttingEdgeTechnologyRebalanced(), new EarthCatapultRebalanced(), new EarthOfficeRebalanced());
    expect(player.getCardCost(new DesignedMicroOrganismsRebalanced())).eq(11);
    expect(player.getCardCost(fakeCard({cost: 15, tags: [Tag.EARTH, Tag.EARTH]}))).eq(7);
    expect(player.getCardCost(new AdaptedLichenRebalanced())).eq(6);
  });

  it('Designed Micro-organisms retains its maximum temperature and plant production', () => {
    const [game, player] = testGame(2);
    const card = new DesignedMicroOrganismsRebalanced();
    setTemperature(game, -14);
    expect(card.canPlay(player)).is.true;
    setTemperature(game, -12);
    expect(card.canPlay(player)).is.false;
    player.playedCards.push(new AdaptationTechnology());
    expect(card.canPlay(player)).is.true;
    card.play(player);
    expect(player.production.plants).eq(2);
  });

  it('Energy Market buys energy or exchanges production for credits', () => {
    const [game, player] = testGame(2);
    const card = new EnergyMarketRebalanced();
    expect(card.canAct(player)).is.false;
    player.megaCredits = 6;
    cast(card.action(player), SelectAmount).cb(2);
    runAllActions(game);
    expect(player.energy).eq(2);
    expect(player.megaCredits).eq(2);
    player.megaCredits = 0;
    player.production.add(Resource.ENERGY, 1);
    expect(card.canAct(player)).is.true;
    card.action(player);
    expect(player.production.energy).eq(0);
    expect(player.megaCredits).eq(8);
  });

  it('Energy Saving counts all city tiles', () => {
    const [game, player, other] = testGame(2);
    game.addCity(player, game.board.getSpaceOrThrow('10'));
    game.addCity(other, game.board.getSpaceOrThrow('20'));
    new EnergySavingRebalanced().play(player);
    expect(player.production.energy).eq(2);
  });

  it('Deimos Down respects protected plant resources', () => {
    const [game, player, other] = testGame(2);
    other.playedCards.push(new ProtectedHabitats());
    other.plants = 10;
    new DeimosDownPromoRebalanced().play(player);
    runAllActions(game);
    const space = cast(player.popWaitingFor(), SelectSpace);
    space.cb(space.spaces[0]);
    runAllActions(game);
    expect(other.plants).eq(10);
  });
});
