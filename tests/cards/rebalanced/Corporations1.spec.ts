import {expect} from 'chai';
import {AphroditeRebalanced} from '@/server/cards/rebalanced/AphroditeRebalanced';
import {ArcadianCommunitiesRebalanced} from '@/server/cards/rebalanced/ArcadianCommunitiesRebalanced';
import {AridorRebalanced} from '@/server/cards/rebalanced/AridorRebalanced';
import {ArklightRebalanced} from '@/server/cards/rebalanced/ArklightRebalanced';
import {AstrodrillRebalanced} from '@/server/cards/rebalanced/AstrodrillRebalanced';
import {CelesticRebalanced} from '@/server/cards/rebalanced/CelesticRebalanced';
import {CheungShingMARSRebalanced} from '@/server/cards/rebalanced/CheungShingMARSRebalanced';
import {EcoLineRebalanced} from '@/server/cards/rebalanced/EcoLineRebalanced';
import {FactorumRebalanced} from '@/server/cards/rebalanced/FactorumRebalanced';
import {HelionRebalanced} from '@/server/cards/rebalanced/HelionRebalanced';
import {InterplanetaryCinematicsRebalanced} from '@/server/cards/rebalanced/InterplanetaryCinematicsRebalanced';
import {InventrixRebalanced} from '@/server/cards/rebalanced/InventrixRebalanced';
import {LakefrontResortsRebalanced} from '@/server/cards/rebalanced/LakefrontResortsRebalanced';
import {MiningGuildRebalanced} from '@/server/cards/rebalanced/MiningGuildRebalanced';
import {MonsInsuranceRebalanced} from '@/server/cards/rebalanced/MonsInsuranceRebalanced';
import {MorningStarIncRebalanced} from '@/server/cards/rebalanced/MorningStarIncRebalanced';
import {ICorporationCard} from '@/server/cards/corporation/ICorporationCard';
import {Tag} from '@/common/cards/Tag';
import {CardType} from '@/common/cards/CardType';
import {Resource} from '@/common/Resource';
import {Units} from '@/common/Units';
import {Phase} from '@/common/Phase';
import {GlobalParameter} from '@/common/GlobalParameter';
import {SpaceBonus} from '@/common/boards/SpaceBonus';
import {TileType} from '@/common/TileType';
import {cast} from '@/common/utils/utils';
import {OrOptions} from '@/server/inputs/OrOptions';
import {SelectCard} from '@/server/inputs/SelectCard';
import {SelectSpace} from '@/server/inputs/SelectSpace';
import {ConvertHeat} from '@/server/cards/base/standardActions/ConvertHeat';
import {Predators} from '@/server/cards/base/Predators';
import {AdaptedLichen} from '@/server/cards/base/AdaptedLichen';
import {Research} from '@/server/cards/base/Research';
import {Asteroid} from '@/server/cards/base/Asteroid';
import {VenusianAnimals} from '@/server/cards/venusNext/VenusianAnimals';
import {StratosphericBirds} from '@/server/cards/venusNext/StratosphericBirds';
import {Dirigibles} from '@/server/cards/venusNext/Dirigibles';
import {Celestic} from '@/server/cards/venusNext/Celestic';
import {Aphrodite} from '@/server/cards/venusNext/Aphrodite';
import {MonsInsurance} from '@/server/cards/promo/MonsInsurance';
import {ArcadianCommunities} from '@/server/cards/promo/ArcadianCommunities';
import {PartyName} from '@/common/turmoil/PartyName';
import {Game} from '@/server/Game';
import {CardName} from '@/common/cards/CardName';
import {Payment} from '@/common/inputs/Payment';
import {SelectPayment} from '@/server/inputs/SelectPayment';
import {SelectColony} from '@/server/inputs/SelectColony';
import {BoardType} from '@/server/boards/BoardType';
import {ProtectedHabitats} from '@/server/cards/base/ProtectedHabitats';
import {AirScrappingExpedition} from '@/server/cards/venusNext/AirScrappingExpedition';
import {serializeCard} from '@/server/cards/cardSerialization';
import {RemoveAnyPlants} from '@/server/deferredActions/RemoveAnyPlants';
import {FloatingHabs} from '@/server/cards/venusNext/FloatingHabs';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions, setRulingParty, setVenusScaleLevel, fakeCard} from '../../TestingUtils';

function play(card: ICorporationCard, player: TestPlayer) {
  player.playedCards.push(card);
  player.megaCredits += card.startingMegaCredits;
  player.defer(card.play(player));
  player.onCardPlayed(card);
  runAllActions(player.game);
}

describe('Rebalanced corporations, group 1', () => {
  const starts: ReadonlyArray<[new () => ICorporationCard, number, Array<Tag>, Partial<Units>, Partial<Units>]> = [
    [AphroditeRebalanced, 50, [Tag.PLANT, Tag.VENUS], {plants: 2}, {}],
    [ArcadianCommunitiesRebalanced, 42, [Tag.BUILDING], {steel: 1}, {steel: 10}],
    [AridorRebalanced, 45, [], {}, {}],
    [ArklightRebalanced, 50, [Tag.ANIMAL], {megacredits: 1}, {}],
    [AstrodrillRebalanced, 40, [Tag.SPACE], {}, {}],
    [CelesticRebalanced, 42, [Tag.VENUS], {}, {}],
    [CheungShingMARSRebalanced, 47, [Tag.BUILDING], {megacredits: 3}, {}],
    [EcoLineRebalanced, 37, [Tag.PLANT], {plants: 3}, {}],
    [FactorumRebalanced, 40, [Tag.POWER, Tag.BUILDING], {steel: 2}, {}],
    [HelionRebalanced, 40, [Tag.SPACE], {heat: 4}, {}],
    [InterplanetaryCinematicsRebalanced, 40, [Tag.BUILDING], {}, {steel: 12}],
    [InventrixRebalanced, 45, [Tag.SCIENCE], {}, {}],
    [LakefrontResortsRebalanced, 46, [Tag.BUILDING], {}, {}],
    [MiningGuildRebalanced, 36, [Tag.BUILDING, Tag.BUILDING], {steel: 1}, {steel: 2}],
    [MonsInsuranceRebalanced, 48, [], {megacredits: 2}, {}],
    [MorningStarIncRebalanced, 50, [Tag.VENUS], {}, {}],
  ];
  for (const [Factory, mc, tags, production, stock] of starts) {
    it(`${Factory.name} starts with the published resources and tags`, () => {
      const [, player] = testGame(2);
      const card = new Factory();
      play(card, player);
      expect(player.megaCredits).eq(mc);
      expect(card.tags).deep.eq(tags);
      expect(player.production.asUnits()).deep.eq(Units.of(production));
      for (const [resource, value] of Object.entries(stock)) {
        expect(player.stock.get(resource as Resource)).eq(value);
      }
    });
  }

  it('Aphrodite pays the owner and raiser for actual Venus steps, including solar owner income', () => {
    const [game, owner, raiser] = testGame(2, {venusNextExtension: true});
    play(new AphroditeRebalanced(), owner);
    game.phase = Phase.ACTION;
    game.increaseVenusScaleLevel(raiser, 2);
    expect(owner.megaCredits).eq(56);
    expect(raiser.megaCredits).eq(4);
    game.phase = Phase.PRELUDES;
    game.increaseVenusScaleLevel(owner, 1);
    expect(owner.megaCredits).eq(61);
    game.phase = Phase.SOLAR;
    setVenusScaleLevel(game, 28);
    game.increaseVenusScaleLevel(raiser, 3);
    expect(owner.megaCredits).eq(64);
    expect(raiser.megaCredits).eq(4);
    game.increaseVenusScaleLevel(raiser, 1);
    expect(owner.megaCredits).eq(64);
  });

  it('Aphrodite forecasts only the Reds surcharge, retaining upfront costs and reserves', () => {
    const [game, owner, raiser] = testGame(2, {venusNextExtension: true, turmoilExtension: true});
    play(new AphroditeRebalanced(), owner);
    setRulingParty(game, PartyName.REDS);
    raiser.megaCredits = 1;
    expect(raiser.canAfford({cost: 0, tr: {venus: 1}})).is.true;
    raiser.megaCredits = 0;
    expect(raiser.canAfford({cost: 1, tr: {venus: 1}})).is.false;
    expect(raiser.canAfford({cost: 0, tr: {venus: 1}, reserveUnits: Units.of({plants: 1})})).is.false;
    owner.megaCredits = 0;
    expect(owner.canAfford({cost: 0, tr: {venus: 1}})).is.true;
    setVenusScaleLevel(game, 14);
    expect(owner.canAfford({cost: 0, tr: {venus: 1}})).is.false;
    owner.megaCredits = 1;
    expect(owner.canAfford({cost: 0, tr: {venus: 1}})).is.true;
    const before = owner.terraformRating;
    game.increaseVenusScaleLevel(owner, 1);
    runAllActions(game);
    expect(owner.terraformRating).eq(before + 2);
    expect(owner.megaCredits).eq(0);
  });

  it('original Aphrodite retains two credits without raiser income', () => {
    const [game, owner, raiser] = testGame(2);
    play(new Aphrodite(), owner);
    game.phase = Phase.ACTION;
    game.increaseVenusScaleLevel(raiser, 2);
    expect(owner.megaCredits).eq(51);
    expect(raiser.megaCredits).eq(0);
    expect(owner.production.plants).eq(1);
  });

  it('Aphrodite retains the full Reds surcharge in the card model and pays after the card cost', () => {
    const [game, owner, raiser] = testGame(2, {venusNextExtension: true, turmoilExtension: true});
    play(new AphroditeRebalanced(), owner);
    setRulingParty(game, PartyName.REDS);
    const card = new AirScrappingExpedition();
    raiser.megaCredits = 13;
    expect(raiser.canPlay(card)).is.false;
    raiser.megaCredits = 14;
    expect(raiser.canPlay(card)).is.true;
    expect(card.additionalProjectCosts?.redsCost).eq(3);
    raiser.stock.deduct(Resource.MEGACREDITS, 13);
    const initialTR = raiser.terraformRating;
    raiser.defer(card.play(raiser));
    runAllActions(game);
    expect(raiser.megaCredits).eq(0);
    expect(raiser.terraformRating).eq(initialTR + 1);
  });

  it('original Aphrodite retains its payout after the Reds affordability check', () => {
    const [game, owner] = testGame(2, {turmoilExtension: true});
    play(new Aphrodite(), owner);
    setRulingParty(game, PartyName.REDS);
    owner.megaCredits = 1;
    const initialTR = owner.terraformRating;
    game.increaseVenusScaleLevel(owner, 1);
    runAllActions(game);
    expect(owner.megaCredits).eq(3);
    expect(owner.terraformRating).eq(initialTR);
  });

  for (const Factory of [ArcadianCommunitiesRebalanced, ArcadianCommunities]) {
    it(`${Factory.name} grants only own reservation placement bonuses outside solar`, () => {
      const [game, player] = testGame(2);
      const card = new Factory();
      player.playedCards.push(card);
      const claim = cast(card.initialAction(player), SelectSpace);
      const space = claim.spaces[0];
      space.bonus = [];
      claim.cb(space);
      game.addCity(player, space);
      runAllActions(game);
      expect(player.megaCredits).eq(3);
      const ordinary = game.board.getAvailableSpacesOnLand(player)[0];
      ordinary.bonus = [];
      game.addTile(player, ordinary, {tileType: TileType.MOHOLE_AREA});
      runAllActions(game);
      expect(player.megaCredits).eq(3);
      const solar = game.board.getAvailableSpacesOnLand(player)[0];
      solar.player = player;
      solar.bonus = [];
      game.phase = Phase.SOLAR;
      game.addTile(player, solar, {tileType: TileType.MOHOLE_AREA});
      runAllActions(game);
      expect(player.megaCredits).eq(3);
    });
  }

  it('Arklight gains production and animals per plant/animal tag and scores pairs', () => {
    const [, player] = testGame(2);
    const card = new ArklightRebalanced();
    play(card, player);
    expect(card.resourceCount).eq(1);
    player.onCardPlayed(fakeCard({tags: [Tag.PLANT, Tag.ANIMAL]}));
    expect(player.production.megacredits).eq(3);
    expect(card.resourceCount).eq(3);
    expect(card.getVictoryPoints(player)).eq(1);
  });

  it('Astrodrill starts with four asteroids and spends one for three titanium', () => {
    const [, player] = testGame(2);
    const card = new AstrodrillRebalanced();
    play(card, player);
    expect(card.resourceCount).eq(4);
    cast(card.action(player), OrOptions).options[0].cb();
    expect(card.resourceCount).eq(3);
    expect(player.titanium).eq(3);
    const options = cast(card.action(player), OrOptions);
    cast(options.options[2].cb(), OrOptions).options[1].cb();
    expect(player.steel).eq(1);
    options.options[1].cb();
    expect(card.resourceCount).eq(4);
  });

  it('Celestic adds one floater to each of two different cards and scores triples', () => {
    const [, player] = testGame(2);
    const card = new CelesticRebalanced();
    const dirigibles = new Dirigibles();
    player.playedCards.push(card, dirigibles);
    card.action(player);
    runAllActions(player.game);
    expect(card.resourceCount).eq(1);
    expect(dirigibles.resourceCount).eq(1);
    player.playedCards.push(new Celestic());
    const selection = cast(card.action(player), SelectCard);
    expect(selection.config.min).eq(2);
    expect(selection.config.max).eq(2);
    selection.cb([card, dirigibles]);
    card.resourceCount = 5;
    expect(card.getVictoryPoints(player)).eq(1);
  });

  it('Celestic draws two floater cards and can add a floater when it is the only target', () => {
    const [, player] = testGame(2);
    const card = new CelesticRebalanced();
    player.playedCards.push(card);
    card.action(player);
    expect(card.resourceCount).eq(1);
    player.game.projectDeck.drawPile = [new AdaptedLichen(), new Dirigibles(), new FloatingHabs()];
    card.initialAction(player);
    expect(player.cardsInHand).has.length(2);
  });

  it('Cheung Shing pays once per building card and grants no building discount', () => {
    const [, player] = testGame(2);
    const card = new CheungShingMARSRebalanced();
    play(card, player);
    player.onCardPlayed(fakeCard({tags: [Tag.BUILDING, Tag.BUILDING]}));
    expect(player.megaCredits).eq(50);
    expect(player.getCardCost(fakeCard({cost: 10, tags: [Tag.BUILDING]}))).eq(10);
  });

  it('EcoLine offers credits or plants per biological tag and retains eight-plant conversion', () => {
    const [game, player] = testGame(2);
    const card = new EcoLineRebalanced();
    play(card, player);
    cast(player.popWaitingFor(), OrOptions).options[1].cb();
    expect(player.plants).eq(1);
    expect(player.plantsNeededForGreenery).eq(8);
    player.onCardPlayed(fakeCard({tags: [Tag.PLANT, Tag.MICROBE, Tag.ANIMAL]}));
    for (let i = 0; i < 3; i++) {
      runAllActions(game);
      cast(player.popWaitingFor(), OrOptions).options[0].cb();
    }
    expect(player.megaCredits).eq(43);
  });

  it('Factorum spends energy to draw a building, or gains energy production when empty', () => {
    const [, player] = testGame(2);
    const card = new FactorumRebalanced();
    player.energy = 0;
    card.action(player);
    expect(player.production.energy).eq(1);
    player.energy = 1;
    player.game.projectDeck.drawPile = [new AdaptedLichen(), new Research(), fakeCard({tags: [Tag.BUILDING]})];
    card.action(player);
    expect(player.energy).eq(0);
    expect(player.cardsInHand).has.length(1);
    expect(player.cardsInHand[0].tags).includes(Tag.BUILDING);
  });

  it('Helion uses heat as money and converts seven heat', () => {
    const [game, player] = testGame(2);
    play(new HelionRebalanced(), player);
    player.megaCredits = 0;
    player.heat = 7;
    expect(player.canAfford(7)).is.true;
    const convert = new ConvertHeat();
    expect(convert.canAct(player)).is.true;
    const temperature = game.getTemperature();
    convert.action(player);
    expect(player.heat).eq(0);
    expect(game.getTemperature()).eq(temperature + 2);
    const option = player.getActions().options.find((o) => o.title === 'Convert 7 heat into temperature');
    expect(option).is.undefined;
    player.heat = 7;
    expect(player.getActions().options.some((o) => o.title === 'Convert 7 heat into temperature')).is.true;
  });

  it('Helion pays the Reds tile-placement policy with heat', () => {
    const [game, player] = testGame(2, {turmoilExtension: true});
    play(new HelionRebalanced(), player);
    setRulingParty(game, PartyName.REDS, 'rp02');
    player.megaCredits = 0;
    player.heat = 2;
    const space = game.board.getAvailableSpacesOnLand(player)[0];
    space.bonus = [];
    game.addTile(player, space, {tileType: TileType.MOHOLE_AREA});
    runAllActions(game);
    const payment = cast(player.popWaitingFor(), SelectPayment);
    expect(payment.amount).eq(2);
    payment.cb(Payment.of({heat: 2}));
    runAllActions(game);
    expect(player.heat).eq(0);
  });

  it('Cinematics pays three credits for events only', () => {
    const [, player] = testGame(2);
    const card = new InterplanetaryCinematicsRebalanced();
    play(card, player);
    player.onCardPlayed(fakeCard({type: CardType.EVENT}));
    player.onCardPlayed(new AdaptedLichen());
    expect(player.megaCredits).eq(43);
  });

  it('Inventrix discounts requirement cards and relaxes global requirements three steps', () => {
    const [, player] = testGame(2);
    const card = new InventrixRebalanced();
    play(card, player);
    expect(player.getCardCost(new Predators())).eq(13);
    expect(player.getCardCost(new AdaptedLichen())).eq(9);
    for (const parameter of [GlobalParameter.OXYGEN, GlobalParameter.TEMPERATURE, GlobalParameter.OCEANS, GlobalParameter.VENUS]) {
      expect(card.getGlobalParameterRequirementBonus(player, parameter)).eq(3);
    }
    card.initialAction(player);
    expect(player.cardsInHand).has.length(3);
  });

  it('Mining Guild selects the matching metal production and only one when both bonuses occur', () => {
    const [game, player, other] = testGame(2);
    const card = new MiningGuildRebalanced();
    play(card, player);
    for (const bonus of [SpaceBonus.STEEL, SpaceBonus.TITANIUM]) {
      const space = game.board.getAvailableSpacesOnLand(player)[0];
      space.bonus = [bonus];
      game.addTile(player, space, {tileType: TileType.MOHOLE_AREA});
      runAllActions(game);
    }
    expect(player.production.steel).eq(2);
    expect(player.production.titanium).eq(1);
    const both = game.board.getAvailableSpacesOnLand(player)[0];
    both.bonus = [SpaceBonus.STEEL, SpaceBonus.TITANIUM];
    game.addTile(player, both, {tileType: TileType.MOHOLE_AREA});
    runAllActions(game);
    cast(player.popWaitingFor(), OrOptions).options[1].cb();
    expect(player.production.steel).eq(2);
    expect(player.production.titanium).eq(2);
    const otherSpace = game.board.getAvailableSpacesOnLand(other)[0];
    otherSpace.bonus = [SpaceBonus.TITANIUM];
    game.addTile(other, otherSpace, {tileType: TileType.MOHOLE_AREA});
    runAllActions(game);
    expect(player.production.titanium).eq(2);
  });

  it('Mons scales production with opponents and insures real attacks for two credits', () => {
    const [, owner, victim, attacker, fourth] = testGame(4);
    play(new MonsInsuranceRebalanced(), owner);
    expect(owner.production.megacredits).eq(6);
    for (const p of [victim, attacker, fourth]) {
      expect(p.production.megacredits).eq(-2);
    }
    expect(owner.megaCredits).eq(48);
    victim.steel = 1;
    victim.stock.deduct(Resource.STEEL, 1, {from: {player: attacker}});
    expect(victim.megaCredits).eq(2);
    expect(owner.megaCredits).eq(46);
    victim.stock.deduct(Resource.STEEL, 1, {from: {player: attacker}});
    expect(owner.megaCredits).eq(46);
    victim.plants = 1;
    victim.stock.deduct(Resource.PLANTS, 1, {from: {player: victim}});
    expect(owner.megaCredits).eq(46);
    owner.megaCredits = 1;
    victim.production.add(Resource.HEAT, 1);
    victim.production.add(Resource.HEAT, -1, {log: false, from: {player: attacker}});
    expect(victim.megaCredits).eq(3);
    expect(owner.megaCredits).eq(0);
  });

  it('Mons uses one neutral opponent in solo and the original payout remains three', () => {
    const [, solo] = testGame(1);
    play(new MonsInsuranceRebalanced(), solo);
    expect(solo.production.megacredits).eq(2);
    cast(new RemoveAnyPlants(solo, 2).execute(), OrOptions).options[0].cb();
    expect(solo.megaCredits).eq(46);
    const [, owner, victim, attacker] = testGame(3);
    play(new MonsInsurance(), owner);
    victim.steel = 1;
    victim.stock.deduct(Resource.STEEL, 1, {from: {player: attacker}});
    expect(victim.megaCredits).eq(3);
  });

  it('Mons does not insure protected or self-inflicted losses', () => {
    const [, owner, victim, attacker] = testGame(3);
    play(new MonsInsuranceRebalanced(), owner);
    victim.playedCards.push(new ProtectedHabitats());
    victim.plants = 3;
    expect(new RemoveAnyPlants(attacker, 2).execute()).is.undefined;
    expect(victim.plants).eq(3);
    expect(owner.megaCredits).eq(48);
    owner.steel = 1;
    owner.stock.deduct(Resource.STEEL, 1, {from: {player: attacker}});
    expect(owner.megaCredits).eq(48);
  });

  it('restores the original insurance provider through the card ability', () => {
    const [game, owner, victim, attacker] = testGame(3);
    play(new MonsInsurance(), owner);
    const restored = Game.deserialize(game.serialize());
    const restoredOwner = restored.getPlayerById(owner.id);
    const restoredVictim = restored.getPlayerById(victim.id);
    expect(restored.monsInsuranceOwner).eq(restoredOwner);
    restoredVictim.steel = 1;
    restoredVictim.stock.deduct(Resource.STEEL, 1, {from: {player: restored.getPlayerById(attacker.id)}});
    expect(restoredVictim.megaCredits).eq(3);
  });

  it('Aridor persists new tag types and adds a colony without counting events or wild tags', () => {
    const [game, player] = testGame(2, {coloniesExtension: true});
    const card = new AridorRebalanced();
    play(card, player);
    player.onCardPlayed(fakeCard({tags: [Tag.ANIMAL, Tag.WILD]}));
    player.onCardPlayed(fakeCard({tags: [Tag.BUILDING], type: CardType.EVENT}));
    const state = serializeCard(card);
    const restored = new AridorRebalanced();
    restored.deserialize(state);
    restored.onCardPlayed(player, fakeCard({tags: [Tag.ANIMAL, Tag.SCIENCE]}));
    expect(player.production.megacredits).eq(2);
    expect(Array.from(restored.allTags)).deep.eq([Tag.ANIMAL, Tag.SCIENCE]);
    card.initialAction(player);
    runAllActions(game);
    const colony = cast(player.popWaitingFor(), SelectColony);
    const selected = colony.colonies[0];
    colony.cb(selected);
    expect(game.colonies).includes(selected);
  });

  it('Arcadian keeps the reservation bonus when covering a tile without repeating the space bonus', () => {
    const [game, player] = testGame(2);
    player.playedCards.push(new ArcadianCommunitiesRebalanced());
    const space = game.board.getAvailableSpacesOnLand(player)[0];
    space.player = player;
    space.tile = {tileType: TileType.SEDIMENT};
    space.bonus = [SpaceBonus.STEEL];
    game.addTile(player, space, {tileType: TileType.CITY});
    runAllActions(game);
    expect(player.steel).eq(0);
    expect(player.megaCredits).eq(6);
  });

  it('Lakefront gains production on another player ocean and increases adjacency income', () => {
    const [game, player, other] = testGame(2);
    play(new LakefrontResortsRebalanced(), player);
    const ocean = game.board.getAvailableSpacesForOcean(other)[0];
    game.addOcean(other, ocean);
    runAllActions(game);
    expect(player.production.megacredits).eq(1);
    expect(player.oceanBonus).eq(3);
    const neighbor = game.board.getAvailableSpacesOnLand(player).find((s) => game.board.getAdjacentSpaces(s).includes(ocean));
    expect(neighbor).is.not.undefined;
    neighbor!.bonus = [];
    game.addTile(player, neighbor!, {tileType: TileType.MOHOLE_AREA});
    runAllActions(game);
    expect(player.megaCredits).eq(49);
  });

  it('Mining Guild ignores solar, covering and non-Mars placement callbacks', () => {
    const [game, player] = testGame(2);
    const card = new MiningGuildRebalanced();
    play(card, player);
    const space = game.board.getAvailableSpacesOnLand(player)[0];
    space.bonus = [SpaceBonus.TITANIUM];
    space.tile = {tileType: TileType.MOHOLE_AREA};
    card.onTilePlaced(player, player, space, BoardType.MOON);
    game.phase = Phase.SOLAR;
    card.onTilePlaced(player, player, space, BoardType.MARS);
    game.phase = Phase.ACTION;
    space.tile.covers = {tileType: TileType.OCEAN};
    card.onTilePlaced(player, player, space, BoardType.MARS);
    runAllActions(game);
    expect(player.production.titanium).eq(0);
  });

  it('new factories leave original cached properties intact', () => {
    const [, player] = testGame(2);
    new ArcadianCommunitiesRebalanced();
    new AstrodrillRebalanced();
    const original = new ArcadianCommunities();
    expect(original.name).eq(CardName.ARCADIAN_COMMUNITIES);
    expect(original.startingMegaCredits).eq(40);
    expect(original.tags).deep.eq([]);
    original.play(player);
    expect(player.production.steel).eq(0);
  });

  it('Morning Star applies three-step Venus requirements and discounts each Venus tag', () => {
    const [, player] = testGame(2, {venusNextExtension: true});
    const card = new MorningStarIncRebalanced();
    play(card, player);
    expect(card.getGlobalParameterRequirementBonus(player, GlobalParameter.VENUS)).eq(3);
    expect(card.getGlobalParameterRequirementBonus(player, GlobalParameter.OXYGEN)).eq(0);
    expect(player.getCardCost(new VenusianAnimals())).eq(13);
    expect(player.getCardCost(fakeCard({cost: 10, tags: [Tag.VENUS, Tag.VENUS]}))).eq(6);
    expect(player.getCardCost(new Asteroid())).eq(14);
    player.game.projectDeck.drawPile = [new AdaptedLichen(), new VenusianAnimals(), new StratosphericBirds(), new Dirigibles()];
    card.initialAction(player);
    expect(player.cardsInHand).has.length(3);
    expect(player.cardsInHand.every((c) => c.tags.includes(Tag.VENUS))).is.true;
  });
});
