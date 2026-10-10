import {expect} from 'chai';
import {ExtractorBalloonsRebalanced} from '@/server/cards/rebalanced/ExtractorBalloonsRebalanced';
import {FloaterLeasingRebalanced} from '@/server/cards/rebalanced/FloaterLeasingRebalanced';
import {ForcedPrecipitationRebalanced} from '@/server/cards/rebalanced/ForcedPrecipitationRebalanced';
import {FuelFactoryRebalanced} from '@/server/cards/rebalanced/FuelFactoryRebalanced';
import {GHGImportFromVenusRebalanced} from '@/server/cards/rebalanced/GHGImportFromVenusRebalanced';
import {GMOContractRebalanced} from '@/server/cards/rebalanced/GMOContractRebalanced';
import {HackersRebalanced} from '@/server/cards/rebalanced/HackersRebalanced';
import {HeatTrappersRebalanced} from '@/server/cards/rebalanced/HeatTrappersRebalanced';
import {IndustrialCenterRebalanced} from '@/server/cards/rebalanced/IndustrialCenterRebalanced';
import {InsectsRebalanced} from '@/server/cards/rebalanced/InsectsRebalanced';
import {JetStreamMicroscrappersRebalanced} from '@/server/cards/rebalanced/JetStreamMicroscrappersRebalanced';
import {MarsUniversityRebalanced} from '@/server/cards/rebalanced/MarsUniversityRebalanced';
import {MartianRailsRebalanced} from '@/server/cards/rebalanced/MartianRailsRebalanced';
import {MassConverterRebalanced} from '@/server/cards/rebalanced/MassConverterRebalanced';
import {MeatIndustryRebalanced} from '@/server/cards/rebalanced/MeatIndustryRebalanced';
import {MicroMillsRebalanced} from '@/server/cards/rebalanced/MicroMillsRebalanced';
import {OrbitalCleanupRebalanced} from '@/server/cards/rebalanced/OrbitalCleanupRebalanced';
import {OutdoorSportsRebalanced} from '@/server/cards/rebalanced/OutdoorSportsRebalanced';
import {ReleaseOfInertGasesRebalanced} from '@/server/cards/rebalanced/ReleaseOfInertGasesRebalanced';
import {ResearchOutpostRebalanced} from '@/server/cards/rebalanced/ResearchOutpostRebalanced';
import {IProjectCard} from '@/server/cards/IProjectCard';
import {Tag} from '@/common/cards/Tag';
import {CardType} from '@/common/cards/CardType';
import {CardResource} from '@/common/CardResource';
import {Resource} from '@/common/Resource';
import {TileType} from '@/common/TileType';
import {PartyName} from '@/common/turmoil/PartyName';
import {cast} from '@/common/utils/utils';
import {OrOptions} from '@/server/inputs/OrOptions';
import {SelectSpace} from '@/server/inputs/SelectSpace';
import {SelectPlayer} from '@/server/inputs/SelectPlayer';
import {SelectCard} from '@/server/inputs/SelectCard';
import {PrivateSecurity} from '@/server/cards/pathfinders/PrivateSecurity';
import {Manutech} from '@/server/cards/venusNext/Manutech';
import {MonsInsurance} from '@/server/cards/promo/MonsInsurance';
import {LawSuit} from '@/server/cards/promo/LawSuit';
import {Fish} from '@/server/cards/base/Fish';
import {Tardigrades} from '@/server/cards/base/Tardigrades';
import {Research} from '@/server/cards/base/Research';
import {AdaptationTechnology} from '@/server/cards/base/AdaptationTechnology';
import {AmazonisEngineer} from '@/server/awards/amazonisPlanitia/AmazonisEngineer';
import {testGame} from '../../TestGame';
import {runAllActions, addCity, churn, fakeCard, setRulingParty, setTemperature, setOxygenLevel} from '../../TestingUtils';

describe('Rebalanced projects, group 2', () => {
  const cards: ReadonlyArray<[new () => IProjectCard, number, Array<Tag>, number, CardType]> = [
    [ExtractorBalloonsRebalanced, 18, [Tag.VENUS], 0, CardType.ACTIVE],
    [FloaterLeasingRebalanced, 3, [], 0, CardType.AUTOMATED],
    [ForcedPrecipitationRebalanced, 4, [Tag.VENUS], 0, CardType.ACTIVE],
    [FuelFactoryRebalanced, 5, [Tag.BUILDING], 0, CardType.AUTOMATED],
    [GHGImportFromVenusRebalanced, 20, [Tag.SPACE, Tag.VENUS], 0, CardType.EVENT],
    [GMOContractRebalanced, 8, [Tag.MICROBE, Tag.SCIENCE], 0, CardType.ACTIVE],
    [HackersRebalanced, 3, [], -1, CardType.AUTOMATED],
    [HeatTrappersRebalanced, 6, [Tag.POWER, Tag.BUILDING], -1, CardType.AUTOMATED],
    [IndustrialCenterRebalanced, 4, [Tag.BUILDING], 0, CardType.ACTIVE],
    [InsectsRebalanced, 11, [Tag.MICROBE], 0, CardType.AUTOMATED],
    [JetStreamMicroscrappersRebalanced, 7, [Tag.VENUS], 0, CardType.ACTIVE],
    [MarsUniversityRebalanced, 12, [Tag.SCIENCE, Tag.BUILDING], 0, CardType.ACTIVE],
    [MartianRailsRebalanced, 12, [Tag.BUILDING], 0, CardType.ACTIVE],
    [MassConverterRebalanced, 8, [Tag.SCIENCE, Tag.POWER], 0, CardType.ACTIVE],
    [MeatIndustryRebalanced, 10, [Tag.BUILDING], 0, CardType.ACTIVE],
    [MicroMillsRebalanced, 2, [], 0, CardType.AUTOMATED],
    [OrbitalCleanupRebalanced, 14, [Tag.EARTH, Tag.SPACE], 2, CardType.ACTIVE],
    [OutdoorSportsRebalanced, 8, [], 1, CardType.AUTOMATED],
    [ReleaseOfInertGasesRebalanced, 13, [], 0, CardType.EVENT],
    [ResearchOutpostRebalanced, 18, [Tag.SCIENCE, Tag.CITY, Tag.BUILDING], -1, CardType.ACTIVE],
  ];
  for (const [Factory, cost, tags, vp, type] of cards) {
    it(`${Factory.name} has the published cost, tags, type and victory points`, () => {
      const [, player] = testGame(2);
      const card = new Factory();
      expect(card.cost).eq(cost);
      expect(card.tags).deep.eq(tags);
      expect(card.type).eq(type);
      expect(card.getVictoryPoints(player)).eq(vp);
    });
  }

  for (const [floaters, expected] of [[1, 0], [3, 1], [6, 3], [21, 10], [30, 10]] as const) {
    it(`Floater Leasing gives ${expected} production for ${floaters} total floaters`, () => {
      const [, player] = testGame(2);
      const storage = new ExtractorBalloonsRebalanced();
      storage.resourceCount = floaters;
      player.playedCards.push(storage);
      const card = new FloaterLeasingRebalanced();
      expect(card.resourceType).is.undefined;
      card.play(player);
      expect(player.production.megacredits).eq(expected);
    });
  }

  it('Floater Leasing counts floaters across cards and exposes its actual production box', () => {
    const [, player] = testGame(2);
    const first = new ExtractorBalloonsRebalanced();
    const second = new JetStreamMicroscrappersRebalanced();
    first.resourceCount = 1;
    second.resourceCount = 22;
    player.playedCards.push(first, second);
    const card = new FloaterLeasingRebalanced();
    card.play(player);
    expect(player.production.megacredits).eq(10);
    expect(AmazonisEngineer.autoInclude(card)).is.true;
  });

  it('Hackers attacks every eligible opponent once without requiring a generation or choosing a target', () => {
    const [game, player, first, second, atMinimum] = testGame(4);
    player.production.add(Resource.ENERGY, 1);
    first.production.override({megacredits: 2});
    second.production.override({megacredits: -4});
    atMinimum.production.override({megacredits: -5});
    const card = new HackersRebalanced();
    expect(card.canPlay(player)).is.true;
    card.play(player);
    runAllActions(game);
    expect(player.production.megacredits).eq(3);
    expect(player.production.energy).eq(0);
    expect(first.production.megacredits).eq(1);
    expect(second.production.megacredits).eq(-5);
    expect(atMinimum.production.megacredits).eq(-5);
    expect(first.removingPlayers).deep.eq([player.id]);
    expect(second.removingPlayers).deep.eq([player.id]);
    expect(atMinimum.removingPlayers).is.empty;
    expect(player.popWaitingFor()).is.undefined;
  });

  it('Hackers preserves production protection and the own energy gate', () => {
    const [game, player, protectedPlayer, other] = testGame(3, {pathfindersExpansion: true});
    protectedPlayer.playedCards.push(new PrivateSecurity());
    const card = new HackersRebalanced();
    expect(card.canPlay(player)).is.false;
    player.production.add(Resource.ENERGY, 1);
    card.play(player);
    runAllActions(game);
    expect(protectedPlayer.production.megacredits).eq(0);
    expect(protectedPlayer.removingPlayers).is.empty;
    expect(other.production.megacredits).eq(-1);
  });

  it('Hackers finishes opponent attacks before Manutech income, Mons payout and own energy loss', () => {
    const [game, player, other] = testGame(2, {underworldExpansion: true});
    const insurance = new MonsInsurance();
    insurance.play(player);
    player.playedCards.push(insurance, new Manutech());
    player.production.override({energy: 1});
    other.production.override({megacredits: 0});
    player.megaCredits = 0;
    other.megaCredits = 0;
    other.underworldData.corruption = 1;
    new HackersRebalanced().play(player);
    runAllActions(game);
    const block = cast(other.popWaitingFor(), OrOptions);
    expect(player.megaCredits).eq(0);
    expect(player.production.megacredits).eq(0);
    expect(player.production.energy).eq(1);
    block.options[1].cb();
    runAllActions(game);
    expect(other.production.megacredits).eq(-1);
    expect(other.megaCredits).eq(0);
    expect(new LawSuit().canPlay(other)).is.true;
    expect(player.megaCredits).eq(3);
    expect(player.production.megacredits).eq(3);
    expect(player.production.energy).eq(0);
  });

  it('Hackers respects an Underworld block without losing later own production', () => {
    const [game, player, other] = testGame(2, {underworldExpansion: true});
    player.production.add(Resource.ENERGY, 1);
    other.underworldData.corruption = 1;
    new HackersRebalanced().play(player);
    runAllActions(game);
    cast(other.popWaitingFor(), OrOptions).options[0].cb();
    runAllActions(game);
    expect(other.underworldData.corruption).eq(0);
    expect(other.production.megacredits).eq(0);
    expect(other.removingPlayers).is.empty;
    expect(player.production.megacredits).eq(3);
    expect(player.production.energy).eq(0);
  });

  it('Hackers in solo gains production without neutral insurance', () => {
    const [game, player] = testGame(1);
    const insurance = new MonsInsurance();
    insurance.play(player);
    player.playedCards.push(insurance);
    player.production.override({energy: 1});
    player.megaCredits = 5;
    new HackersRebalanced().play(player);
    runAllActions(game);
    expect(player.megaCredits).eq(5);
    expect(player.production.megacredits).eq(3);
    expect(player.production.energy).eq(0);
  });

  it('Heat Trappers requires -22 or warmer and decreases heat through the shared target contract', () => {
    const [game, player] = testGame(2);
    player.production.add(Resource.HEAT, 2);
    const card = new HeatTrappersRebalanced();
    setTemperature(game, -24);
    expect(card.canPlay(player)).is.false;
    setTemperature(game, -22);
    expect(card.canPlay(player)).is.true;
    card.play(player);
    runAllActions(game);
    cast(player.popWaitingFor(), SelectPlayer).cb(player);
    runAllActions(game);
    expect(player.production.heat).eq(0);
    expect(player.production.energy).eq(1);
  });

  it('Industrial Center uses the six-credit action and the existing adjacent city tile placement', () => {
    const [game, player] = testGame(2);
    const card = new IndustrialCenterRebalanced();
    expect(card.canPlay(player)).is.false;
    addCity(player);
    expect(card.canPlay(player)).is.true;
    card.play(player);
    runAllActions(game);
    const place = cast(player.popWaitingFor(), SelectSpace);
    const space = place.spaces[0];
    place.cb(space);
    expect(space.tile?.tileType).eq(TileType.INDUSTRIAL_CENTER);
    player.megaCredits = 5;
    expect(card.canAct(player)).is.false;
    player.megaCredits = 6;
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);
    expect(player.megaCredits).eq(0);
    expect(player.production.steel).eq(1);
  });

  it('Mass Converter requires six science tags and discounts each Space card only once', () => {
    const [, player] = testGame(2);
    const card: IProjectCard = new MassConverterRebalanced();
    player.tagsForTest = {science: 5};
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {science: 6};
    expect(card.canPlay(player)).is.true;
    expect(card.requirements[0].count).eq(6);
    expect(card.metadata.description).eq('Requires 6 science tags. Increase your energy production 6 steps.');
    card.play(player);
    expect(player.production.energy).eq(6);
    expect(card.getCardDiscount?.(player, fakeCard({tags: [Tag.SPACE, Tag.SPACE]}))).eq(2);
    expect(card.getCardDiscount?.(player, new Research())).eq(0);
  });

  it('Orbital Cleanup leaves production unchanged and pays floor(science tags / 2)', () => {
    const [game, player] = testGame(2);
    const card = new OrbitalCleanupRebalanced();
    player.production.override({megacredits: -4});
    expect(card.canPlay(player)).is.true;
    card.play(player);
    expect(player.production.megacredits).eq(-4);
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);
    expect(player.megaCredits).eq(0);
    player.tagsForTest = {science: 3};
    card.action(player);
    runAllActions(game);
    expect(player.megaCredits).eq(1);
  });

  it('Outdoor Sports requires a city next to an ocean and gives three production', () => {
    const [game, player, other] = testGame(2);
    const card = new OutdoorSportsRebalanced();
    expect(card.canPlay(player)).is.false;
    const ocean = game.board.getAvailableSpacesForOcean(player)[0];
    game.addOcean(player, ocean);
    expect(card.canPlay(player)).is.false;
    const adjacent = game.board.getAvailableSpacesForCity(other).find((space) => game.board.getAdjacentSpaces(ocean).includes(space));
    if (adjacent === undefined) {
      throw new Error('No adjacent city space');
    }
    game.addCity(other, adjacent);
    expect(card.canPlay(player)).is.true;
    card.play(player);
    expect(player.production.megacredits).eq(3);
  });

  it('Mars University can exchange a card on its own Science tag and decline a later exchange', () => {
    const [game, player] = testGame(2);
    const card = new MarsUniversityRebalanced();
    const discarded = new MicroMillsRebalanced();
    player.cardsInHand.push(discarded);
    card.onCardPlayed(player, card);
    runAllActions(game);
    const choice = cast(player.popWaitingFor(), OrOptions);
    cast(choice.options[0], SelectCard).cb([discarded]);
    expect(player.cardsInHand).has.lengthOf(1);
    expect(player.cardsInHand[0]).not.eq(discarded);
    expect(game.projectDeck.discardPile).includes(discarded);
    card.onCardPlayed(player, new Research());
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[1].cb();
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[1].cb();
    runAllActions(game);
    expect(player.cardsInHand).has.lengthOf(1);
  });

  it('Research Outpost places an isolated city and preserves its one-credit discount', () => {
    const [game, player] = testGame(2);
    addCity(player);
    const card = new ResearchOutpostRebalanced();
    expect(card.canPlay(player)).is.true;
    card.play(player);
    runAllActions(game);
    const place = cast(player.popWaitingFor(), SelectSpace);
    for (const space of place.spaces) {
      expect(game.board.getAdjacentSpaces(space).every((adjacent) => adjacent.tile === undefined)).is.true;
    }
    const space = place.spaces[0];
    place.cb(space);
    expect(space.tile?.tileType).eq(TileType.CITY);
    expect(card.getCardDiscount(player, new Research())).eq(1);
    expect(card.getVictoryPoints(player)).eq(-1);
  });

  it('Meat Industry pays for animals added to owned cards but not microbes or opponents', () => {
    const [, player, other] = testGame(2);
    player.playedCards.push(new MeatIndustryRebalanced());
    const fish = new Fish();
    const microbes = new Tardigrades();
    const otherFish = new Fish();
    player.playedCards.push(fish, microbes);
    other.playedCards.push(otherFish);
    player.addResourceTo(fish, 3);
    expect(fish.resourceCount).eq(3);
    expect(player.megaCredits).eq(6);
    player.addResourceTo(microbes, 2);
    other.addResourceTo(otherFish, 1);
    expect(player.megaCredits).eq(6);
  });

  it('Fuel Factory exchanges energy production while Micro-Mills adds heat production', () => {
    const [, player] = testGame(2);
    const fuel = new FuelFactoryRebalanced();
    expect(fuel.canPlay(player)).is.false;
    player.production.add(Resource.ENERGY, 1);
    expect(fuel.canPlay(player)).is.true;
    fuel.play(player);
    new MicroMillsRebalanced().play(player);
    expect(player.production.asUnits()).includes({energy: 0, titanium: 1, megacredits: 1, heat: 1});
  });

  it('Insects requires oxygen and gains production per Plant tag', () => {
    const [game, player] = testGame(2);
    const card = new InsectsRebalanced();
    player.tagsForTest = {plant: 3};
    setOxygenLevel(game, 5);
    expect(card.canPlay(player)).is.false;
    setOxygenLevel(game, 6);
    expect(card.canPlay(player)).is.true;
    card.play(player);
    expect(player.production.plants).eq(3);
  });

  it('GMO Contract keeps its Greens gate and pays for each biological tag including itself', () => {
    const [game, player] = testGame(2, {turmoilExtension: true});
    const card = new GMOContractRebalanced();
    setRulingParty(game, PartyName.REDS);
    expect(card.canPlay(player)).is.false;
    setRulingParty(game, PartyName.GREENS);
    expect(card.canPlay(player)).is.true;
    card.onCardPlayed(player, card);
    card.onCardPlayed(player, fakeCard({tags: [Tag.PLANT, Tag.MICROBE, Tag.ANIMAL]}));
    runAllActions(game);
    expect(player.megaCredits).eq(8);
  });

  it('Martian Rails spends an energy and counts Mars cities', () => {
    const [game, player, other] = testGame(2);
    const card = new MartianRailsRebalanced();
    expect(card.canAct(player)).is.false;
    addCity(player);
    addCity(other);
    player.energy = 1;
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);
    expect(player.energy).eq(0);
    expect(player.megaCredits).eq(2);
  });

  it('Extractor Balloons gains three floaters then adds one or raises Venus', () => {
    const [game, player] = testGame(2, {venusNextExtension: true});
    const card = new ExtractorBalloonsRebalanced();
    card.play(player);
    runAllActions(game);
    expect(card.resourceType).eq(CardResource.FLOATER);
    expect(card.resourceCount).eq(3);
    cast(churn(card.action(player), player), OrOptions).options[1].cb();
    runAllActions(game);
    expect(card.resourceCount).eq(4);
    cast(churn(card.action(player), player), OrOptions).options[0].cb();
    runAllActions(game);
    expect(card.resourceCount).eq(2);
    expect(game.getVenusScaleLevel()).eq(2);
  });

  it('Forced Precipitation pays two credits for a floater and can spend two to raise Venus', () => {
    const [game, player] = testGame(2, {venusNextExtension: true});
    const card = new ForcedPrecipitationRebalanced();
    expect(card.canAct(player)).is.false;
    player.megaCredits = 2;
    expect(card.canAct(player)).is.true;
    churn(card.action(player), player);
    expect(player.megaCredits).eq(0);
    expect(card.resourceCount).eq(1);
    player.addResourceTo(card);
    card.action(player);
    runAllActions(game);
    expect(card.resourceCount).eq(0);
    expect(game.getVenusScaleLevel()).eq(2);
  });

  it('Jet Stream spends one titanium for two floaters then raises Venus', () => {
    const [game, player] = testGame(2, {venusNextExtension: true});
    const card = new JetStreamMicroscrappersRebalanced();
    expect(card.canAct(player)).is.false;
    player.titanium = 1;
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);
    expect(player.titanium).eq(0);
    expect(card.resourceCount).eq(2);
    card.action(player);
    runAllActions(game);
    expect(card.resourceCount).eq(0);
    expect(game.getVenusScaleLevel()).eq(2);
  });

  it('Venus actions use current Reds affordability and retain their alternate action', () => {
    const [game, player] = testGame(2, {venusNextExtension: true, turmoilExtension: true});
    setRulingParty(game, PartyName.REDS);
    const extractor = new ExtractorBalloonsRebalanced();
    extractor.resourceCount = 2;
    extractor.action(player);
    runAllActions(game);
    expect(extractor.resourceCount).eq(3);
    expect(game.getVenusScaleLevel()).eq(0);
    const forced = new ForcedPrecipitationRebalanced();
    forced.resourceCount = 2;
    player.megaCredits = 2;
    expect(forced.canAct(player)).is.true;
    churn(forced.action(player), player);
    expect(forced.resourceCount).eq(3);
    expect(player.megaCredits).eq(0);
    const jet = new JetStreamMicroscrappersRebalanced();
    jet.resourceCount = 2;
    expect(jet.canAct(player)).is.false;
    player.megaCredits = 3;
    expect(jet.canAct(player)).is.true;
    jet.action(player);
    runAllActions(game);
    expect(jet.resourceCount).eq(0);
    expect(player.megaCredits).eq(0);
    expect(game.getVenusScaleLevel()).eq(2);
  });

  it('GHG Import and Release of Inert Gases apply their production and actual TR steps', () => {
    const [game, player] = testGame(2, {venusNextExtension: true});
    const tr = player.terraformRating;
    new GHGImportFromVenusRebalanced().play(player);
    runAllActions(game);
    expect(player.production.heat).eq(3);
    expect(game.getVenusScaleLevel()).eq(2);
    expect(player.terraformRating).eq(tr + 1);
    new ReleaseOfInertGasesRebalanced().play(player);
    runAllActions(game);
    expect(player.terraformRating).eq(tr + 3);
  });

  it('Release of Inert Gases reserves the full Reds surcharge', () => {
    const [game, player] = testGame(2, {turmoilExtension: true});
    setRulingParty(game, PartyName.REDS);
    const card = new ReleaseOfInertGasesRebalanced();
    player.megaCredits = 18;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = 19;
    expect(player.canPlay(card)).is.true;
    const tr = player.terraformRating;
    card.play(player);
    runAllActions(game);
    expect(player.terraformRating).eq(tr + 2);
    expect(player.megaCredits).eq(13);
  });

  it('Heat Trappers honors the existing Adaptation Technology global requirement bonus', () => {
    const [game, player] = testGame(2);
    player.production.add(Resource.HEAT, 2);
    player.playedCards.push(new AdaptationTechnology());
    setTemperature(game, -26);
    expect(new HeatTrappersRebalanced().canPlay(player)).is.true;
  });
});
