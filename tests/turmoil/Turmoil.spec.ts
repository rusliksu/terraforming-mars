import {expect} from 'chai';
import {PartyName} from '../../src/common/turmoil/PartyName';
import {IGame} from '../../src/server/IGame';
import {MarsFirst} from '../../src/server/turmoil/parties/MarsFirst';
import {Phase} from '../../src/common/Phase';
import {OrOptions} from '../../src/server/inputs/OrOptions';
import {SelectSpace} from '../../src/server/inputs/SelectSpace';
import {SpaceBonus} from '../../src/common/boards/SpaceBonus';
import {SpaceType} from '../../src/common/boards/SpaceType';
import {Delegate, Turmoil} from '../../src/server/turmoil/Turmoil';
import {maxOutOceans, runAllActions, setOxygenLevel, setRulingParty as setRulingPartyByName, setTemperature, setVenusScaleLevel} from '../TestingUtils';
import {TestPlayer} from '../TestPlayer';
import {Reds} from '../../src/server/turmoil/parties/Reds';
import {Greens} from '../../src/server/turmoil/parties/Greens';
import {ReleaseOfInertGases} from '../../src/server/cards/base/ReleaseOfInertGases';
import {JovianEmbassy} from '../../src/server/cards/promo/JovianEmbassy';
import {IceAsteroid} from '../../src/server/cards/base/IceAsteroid';
import {ProtectedValley} from '../../src/server/cards/base/ProtectedValley';
import {MagneticFieldGeneratorsPromo} from '../../src/server/cards/promo/MagneticFieldGeneratorsPromo';
import {Resource} from '../../src/common/Resource';
import {NitrogenFromTitan} from '../../src/server/cards/colonies/NitrogenFromTitan';
import {SpaceStation} from '../../src/server/cards/base/SpaceStation';
import {EarthCatapult} from '../../src/server/cards/base/EarthCatapult';
import {QuantumExtractor} from '../../src/server/cards/base/QuantumExtractor';
import * as constants from '../../src/common/constants';
import {SerializedTurmoil} from '../../src/server/turmoil/SerializedTurmoil';
import {PoliticalAgendas} from '../../src/server/turmoil/PoliticalAgendas';
import {IParty} from '../../src/server/turmoil/parties/IParty';
import {GreeneryStandardProject} from '../../src/server/cards/base/standardProjects/GreeneryStandardProject';
import {ArtificialLake} from '../../src/server/cards/base/ArtificialLake';
import {LavaFlows} from '../../src/server/cards/base/LavaFlows';
import {StripMine} from '../../src/server/cards/base/StripMine';
import {GiantSolarShade} from '../../src/server/cards/venusNext/GiantSolarShade';
import {WaterTreatmentComplex} from '../../src/server/cards/moon/WaterTreatmentComplex';
import {DarksideMeteorBombardment} from '../../src/server/cards/moon/DarksideMeteorBombardment';
import {LunaStagingStation} from '../../src/server/cards/moon/LunaStagingStation';
import {MoonExpansion} from '../../src/server/moon/MoonExpansion';
import {TileType} from '../../src/common/TileType';
import {testGame} from '../TestGame';
import {MultiSet} from 'mnemonist';
import {TowingAComet} from '../../src/server/cards/base/TowingAComet';
import {cast} from '@/common/utils/utils';
import {TurmoilHandler} from '../../src/server/turmoil/TurmoilHandler';

describe('Turmoil', () => {
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;
  let turmoil: Turmoil;

  beforeEach(() => {
    [game, player, player2] = testGame(2, {turmoilExtension: true});
    game.phase = Phase.ACTION;
    turmoil = Turmoil.getTurmoil(game);
    // Eliminate the flaky cases where the current global event sends delegates to
    // parties, changing the dominant party outcome.
    turmoil.parties.forEach((p) => p.delegates.clear());
    turmoil.delegateReserve.set('NEUTRAL', constants.DELEGATES_FOR_NEUTRAL_PLAYER);
  });

  it('Should initialize with right defaults', () => {
    expect(turmoil.chairman).to.eq('NEUTRAL');
    expect(turmoil.rulingParty.name).to.eq(PartyName.GREENS);
  });

  it('Correctly send delegate from the reserve', () => {
    const greens = turmoil.getPartyByName(PartyName.GREENS);
    greens.delegates.clear();
    expect(turmoil.usedFreeDelegateAction).does.not.contain(player);

    turmoil.sendDelegateToParty(player, PartyName.GREENS, game);

    expectDelegateMatch(greens.delegates, player);
    expect(turmoil.usedFreeDelegateAction).does.not.contain(player);
  });


  it('Do not send delegate from reserve when reserve is empty', () => {
    const greens = turmoil.getPartyByName(PartyName.GREENS);
    greens.delegates.clear();
    turmoil.delegateReserve.clear();

    turmoil.sendDelegateToParty(player, PartyName.GREENS, game);
    expect(greens.delegates.size).eq(0);
  });

  it('Counts influence correctly for dominant party', () => {
    turmoil.parties.forEach((party) => party.delegates.clear());

    const greens = turmoil.getPartyByName(PartyName.GREENS);
    turmoil.sendDelegateToParty(player, PartyName.GREENS, game);
    expect(greens.delegates.size).eq(1);

    // 1 influence: Leader of dominant party
    expectDelegateMatch(greens.delegates, player);
    expect(greens.partyLeader).to.eq(player);
    expect(turmoil.getInfluence(player)).to.eq(1);

    // 2 influence: Leader of dominant party + at least 1 non-leader delegate in party
    turmoil.sendDelegateToParty(player, PartyName.GREENS, game);
    expect(greens.delegates.size).eq(2);
    expect(turmoil.getInfluence(player)).to.eq(2);
  });

  it('Chairman gives 1 influence', () => {
    turmoil.parties.forEach((party) => party.delegates.clear());
    turmoil.chairman = player;
    expect(turmoil.getInfluence(player)).to.eq(1);
  });

  it('Correctly set dominant party', () => {
    const greens = turmoil.getPartyByName(PartyName.GREENS);
    const reds = turmoil.getPartyByName(PartyName.REDS);
    greens.delegates.clear();
    reds.delegates.clear();

    turmoil.sendDelegateToParty(player, PartyName.GREENS, game);
    turmoil.sendDelegateToParty(player, PartyName.GREENS, game);
    turmoil.sendDelegateToParty(player, PartyName.GREENS, game);
    expect(turmoil.dominantParty).to.eq(greens);

    turmoil.sendDelegateToParty(player, PartyName.REDS, game);
    expect(turmoil.dominantParty).to.eq(greens);

    turmoil.sendDelegateToParty(player, PartyName.REDS, game);
    turmoil.sendDelegateToParty(player, PartyName.REDS, game);
    turmoil.sendDelegateToParty(player, PartyName.REDS, game);
    expect(turmoil.dominantParty).to.eq(reds);
  });

  it('Correctly set party leader', () => {
    const party = turmoil.getPartyByName(PartyName.GREENS);
    turmoil.sendDelegateToParty(player, party.name, game);
    turmoil.sendDelegateToParty(player, party.name, game);
    turmoil.sendDelegateToParty(player, party.name, game);
    expect(party.partyLeader).to.eq(player);
  });

  it('Correctly run end of generation', () => {
    player.setTerraformRating(20);
    player2.setTerraformRating(21);

    turmoil.sendDelegateToParty(player, PartyName.REDS, game);
    turmoil.sendDelegateToParty(player, PartyName.REDS, game);
    turmoil.sendDelegateToParty(player, PartyName.REDS, game);
    turmoil.sendDelegateToParty(player, PartyName.REDS, game);
    turmoil.sendDelegateToParty(player, PartyName.REDS, game);
    turmoil.sendDelegateToParty(player, PartyName.GREENS, game);
    turmoil.sendDelegateToParty(player, PartyName.GREENS, game);
    turmoil.sendDelegateToParty(player2, PartyName.GREENS, game);

    turmoil.usedFreeDelegateAction.add(player);
    turmoil.usedFreeDelegateAction.add(player2);

    expect(turmoil.getAvailableDelegateCount(player)).eq(0);
    expect(turmoil.getAvailableDelegateCount(player2)).eq(6);

    game.phase = Phase.SOLAR;
    turmoil.endGeneration(game);
    runAllActions(game);

    expect(turmoil.chairman).to.eq(player);
    // both players lose 1 TR; player gains 1 TR from Reds ruling bonus, 1 TR from chairman
    expect(player.terraformRating).to.eq(21);
    expect(player2.terraformRating).to.eq(20);

    expect(turmoil.getAvailableDelegateCount(player)).eq(4);
    expect(turmoil.getAvailableDelegateCount(player2)).eq(6);

    expect(turmoil.usedFreeDelegateAction).is.empty;
    expect(turmoil.rulingParty).to.eq(turmoil.getPartyByName(PartyName.REDS));
    expect(turmoil.dominantParty).to.eq(turmoil.getPartyByName(PartyName.GREENS));
  });

  it('Player that is chairman has one fewer delegate avaialble ', () => {
    turmoil.sendDelegateToParty(player, PartyName.REDS, game);
    turmoil.sendDelegateToParty(player, PartyName.REDS, game);

    expect(turmoil.getAvailableDelegateCount(player)).eq(5);

    game.phase = Phase.SOLAR;
    turmoil.endGeneration(game);
    runAllActions(game);

    expect(turmoil.chairman).to.eq(player);
    expect(turmoil.getAvailableDelegateCount(player)).eq(6);
  });

  it('Does not give Mars First bonus for World Government terraforming', () => {
    setRulingParty(turmoil, game, new MarsFirst());
    game.phase = Phase.SOLAR;

    game.worldGovernmentTerraforming();
    const action = cast(player.getWaitingFor(), OrOptions);
    const placeOcean = cast(action.options.find((option) => option.title === 'Add an ocean'), SelectSpace);
    const steelSpace = placeOcean.spaces.find((space) => space.bonus.includes(SpaceBonus.STEEL));

    placeOcean.cb(steelSpace!);
    expect(player.steel).to.eq(0); // should not give ruling policy bonus
  });

  it('Does not give Mars First steel for colony-space tile placements', () => {
    setRulingParty(turmoil, game, new MarsFirst());
    const colonySpace = game.board.spaces.find((space) => space.spaceType === SpaceType.COLONY)!;

    game.addTile(player, colonySpace, {tileType: TileType.CITY});

    expect(player.steel).to.eq(0);
    expect(game.gameLog.some((message) => message.message === '${0} gained ${1} steel from Turmoil ${2} policy')).is.false;
  });

  it('Logs Mars First steel from tile placements', () => {
    setRulingParty(turmoil, game, new MarsFirst());
    const space = game.board.getAvailableSpacesOnLand(player)[0];

    game.addTile(player, space, {tileType: TileType.CITY});

    const log = game.gameLog.find((message) => message.message === '${0} gained ${1} steel from Turmoil ${2} policy');
    expect(log).is.not.undefined;
    expect(log!.data[1].value).to.eq('1');
    expect(log!.data[2].value).to.eq(PartyName.MARS);
  });

  it('Does not give Mars First steel for Moon tile placements', () => {
    const [moonGame, moonPlayer] = testGame(1, {turmoilExtension: true, moonExpansion: true});
    moonGame.phase = Phase.ACTION;
    const moonTurmoil = Turmoil.getTurmoil(moonGame);
    setRulingParty(moonTurmoil, moonGame, new MarsFirst());
    const moonSpace = MoonExpansion.moonData(moonGame).moon.spaces.find((space) => space.spaceType === SpaceType.LUNAR_MINE)!;

    MoonExpansion.addMineTile(moonPlayer, moonSpace.id);

    expect(moonPlayer.steel).to.eq(0);
    expect(moonGame.gameLog.some((message) => message.message === '${0} gained ${1} steel from Turmoil ${2} policy')).is.false;
  });

  it('Logs passive Turmoil policy resource gains', () => {
    setRulingPartyByName(game, PartyName.GREENS, 'gp02');
    game.addTile(player, game.board.getAvailableSpacesOnLand(player)[0], {tileType: TileType.CITY});
    expectLog('${0} gained ${1} plant from Turmoil ${2} policy');

    setRulingPartyByName(game, PartyName.GREENS, 'gp03');
    TurmoilHandler.applyOnCardPlayedEffect(player, new ProtectedValley());
    runAllActions(game);
    expectLog('${0} gained ${1} M€ from Turmoil ${2} policy');

    setRulingPartyByName(game, PartyName.MARS, 'mp02');
    TurmoilHandler.applyOnCardPlayedEffect(player, new StripMine());
    expectLog('${0} gained ${1} M€ from Turmoil ${2} policy', PartyName.MARS);

    setRulingPartyByName(game, PartyName.KELVINISTS, 'kp02');
    game.increaseTemperature(player, 1);
    expectLog('${0} gained ${1} M€ from Turmoil ${2} policy', PartyName.KELVINISTS);

    setRulingPartyByName(game, PartyName.KELVINISTS, 'kp04');
    game.addTile(player, game.board.getAvailableSpacesOnLand(player)[0], {tileType: TileType.CITY});
    expectLog('${0} gained ${1} heat from Turmoil ${2} policy');
  });

  it('Logs Turmoil ruling bonus resource gains', () => {
    player.playedCards.push(new StripMine(), new ProtectedValley(), new SpaceStation());
    player.production.override({heat: 2});
    player.cardsInHand.push(new LavaFlows(), new ArtificialLake(), new IceAsteroid());
    game.gameLog.length = 0;

    turmoil.getPartyByName(PartyName.MARS).bonuses[0]!.grantForPlayer!(player);
    expectLog('${0} gained ${1} M€ from Turmoil ${2} ruling bonus', PartyName.MARS);

    turmoil.getPartyByName(PartyName.GREENS).bonuses[0]!.grantForPlayer!(player);
    expectLog('${0} gained ${1} M€ from Turmoil ${2} ruling bonus', PartyName.GREENS);

    turmoil.getPartyByName(PartyName.KELVINISTS).bonuses[1]!.grantForPlayer!(player);
    expectLog('${0} gained ${1} heat from Turmoil ${2} ruling bonus', PartyName.KELVINISTS);

    turmoil.getPartyByName(PartyName.SCIENTISTS).bonuses[1]!.grantForPlayer!(player);
    expectLog('${0} gained ${1} M€ from Turmoil ${2} ruling bonus', PartyName.SCIENTISTS);

    turmoil.getPartyByName(PartyName.UNITY).bonuses[1]!.grantForPlayer!(player);
    expectLog('${0} gained ${1} M€ from Turmoil ${2} ruling bonus', PartyName.UNITY);
  });

  it('Cannot raise TR via Standard Projects if Reds are ruling and player cannot pay', () => {
    setRulingParty(turmoil, game, new Reds());
    player.megaCredits = 14;
    const standardProjects = player.getStandardProjectOption();

    // can only use Power Plant as cannot pay 3 for Reds ruling policy
    expect(standardProjects.enabled![0]).to.eq(true);
    expect(standardProjects.enabled!.slice(1)).to.not.contain(true);
  });

  it('Can do SP greenery at normal cost if Reds are ruling and oxygen is maxed', () => {
    setRulingParty(turmoil, game, new Reds());
    player.megaCredits = 23;
    expect(new GreeneryStandardProject().canAct(player)).equal(false);

    setOxygenLevel(game, constants.MAX_OXYGEN_LEVEL);
    expect(new GreeneryStandardProject().canAct(player)).equal(true);
  });

  it('Cannot play cards to raise TR directly if Reds are ruling and player cannot pay', () => {
    setRulingParty(turmoil, game, new Reds());
    player.megaCredits = 16;
    const releaseOfInertGases = new ReleaseOfInertGases();
    const jovianEmbassy = new JovianEmbassy();

    expect(player.canPlay(releaseOfInertGases)).is.not.true; // needs 20 MC
    expect(player.canPlay(jovianEmbassy)).is.not.true; // needs 17 MC

    player.production.add(Resource.ENERGY, 4);
    player.megaCredits = 30;
    const magneticFieldGeneratorsPromo = new MagneticFieldGeneratorsPromo();
    expect(player.canPlay(magneticFieldGeneratorsPromo)).is.not.true; // needs 31 MC
  });

  it('Cannot play cards to raise TR via global parameters if Reds are ruling and player cannot pay', () => {
    setRulingParty(turmoil, game, new Reds());
    // Both of these cards cost 23MC.
    const iceAsteroid = new IceAsteroid();
    const protectedValley = new ProtectedValley();
    player.megaCredits = 25;

    expect(player.canPlay(iceAsteroid)).is.not.true; // needs 29 MC
    expect(player.canPlay(protectedValley)).is.not.true; // needs 26 MC

    // can play if won't gain TR from raising global parameter
    maxOutOceans(player, 9);
    expect(player.canPlay(protectedValley)).is.true;
    expect(protectedValley.additionalProjectCosts).deep.eq({redsCost: 3});
    expect(player.canPlay(iceAsteroid)).is.true;
  });

  it('Applies card discounts when checking canPlay while Reds are ruling', () => {
    setRulingParty(turmoil, game, new Reds());
    const nitrogenFromTitan = new NitrogenFromTitan();

    player.megaCredits = 29;
    expect(player.canPlay(nitrogenFromTitan)).is.not.true; // needs 31 MC

    player.playedCards.push(new SpaceStation());
    expect(player.canPlay(nitrogenFromTitan)).is.true;
    expect(nitrogenFromTitan.additionalProjectCosts).deep.eq({redsCost: 6}); // 25 + 6 - 2

    player.playedCards.push(new EarthCatapult(), new QuantumExtractor());
    player.megaCredits = 25;
    expect(player.canPlay(nitrogenFromTitan)).is.true;
    expect(nitrogenFromTitan.additionalProjectCosts).deep.eq({redsCost: 6}); // 25 + 6 - 6
  });


  it('canPlay: Reds tax applies by default when raising oxygen', () => {
  // Strip Mine raises the oxygen level two steps.
    const card = new StripMine();
    const [game, player] = testGame(1, {turmoilExtension: true});
    const turmoil = Turmoil.getTurmoil(game);
    game.phase = Phase.ACTION;
    player.production.override({energy: 2}); // Card requirement.

    turmoil.rulingParty = new Greens();
    PoliticalAgendas.setNextAgenda(turmoil, game);
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.true;

    turmoil.rulingParty = new Reds();
    PoliticalAgendas.setNextAgenda(turmoil, game);
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.false;

    player.megaCredits = card.cost + 5;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 6;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 6});

    setOxygenLevel(game, constants.MAX_OXYGEN_LEVEL - 1);
    player.megaCredits = card.cost + 2;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 3;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 3});

    setOxygenLevel(game, constants.MAX_OXYGEN_LEVEL);

    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.true;
  });

  it('canPlay: when paying reds tax for oxygen, include the cost for the 8% temperature bump.', () => {
  // Strip Mine raises the oxygen level two steps.
    const card = new StripMine();
    const [game, player] = testGame(1, {turmoilExtension: true});
    const turmoil = Turmoil.getTurmoil(game);
    game.phase = Phase.ACTION;
    player.production.override({energy: 2}); // Card requirement.

    turmoil.rulingParty = new Reds();
    PoliticalAgendas.setNextAgenda(turmoil, game);

    // Raising to 8%
    setOxygenLevel(game, 7);

    player.megaCredits = card.cost + 8;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 9;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 9});
  });

  it('canPlay: when paying reds tax for oxygen, include the cost for the 8% temperature bump, which triggers 0° ocean bump.', () => {
    // Strip Mine raises the oxygen level two steps.
    const card = new StripMine();
    const [game, player] = testGame(1, {turmoilExtension: true});
    const turmoil = Turmoil.getTurmoil(game);
    game.phase = Phase.ACTION;
    player.production.override({energy: 2}); // Card requirement.

    turmoil.rulingParty = new Reds();
    PoliticalAgendas.setNextAgenda(turmoil, game);

    // Raising to 8%
    setOxygenLevel(game, 7);
    // Raising to 0
    setTemperature(game, -2);

    player.megaCredits = card.cost + 11;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 12;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 12});
  });

  it('canPlay: reds tax applies by default when raising temperature', () => {
    // LavaFlows raises the temperature two steps.
    const card = new LavaFlows();
    const [game, player] = testGame(1, {turmoilExtension: true});
    const turmoil = Turmoil.getTurmoil(game);
    game.phase = Phase.ACTION;

    turmoil.rulingParty = new Greens();
    PoliticalAgendas.setNextAgenda(turmoil, game);
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.true;

    turmoil.rulingParty = new Reds();
    PoliticalAgendas.setNextAgenda(turmoil, game);
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.false;

    player.megaCredits = card.cost + 5;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 6;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 6});

    // Set temperature so it only raises one step.
    setTemperature(game, constants.MAX_TEMPERATURE - 2);

    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 3;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 3});

    setTemperature(game, constants.MAX_TEMPERATURE);

    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.true;
  });

  it('canPlay: when paying reds tax for temperature, include the cost for the 0° ocean bump.', () => {
    // LavaFlows raises the temperature two steps.
    const card = new LavaFlows();
    const [game, player] = testGame(1, {turmoilExtension: true});
    const turmoil = Turmoil.getTurmoil(game);
    game.phase = Phase.ACTION;

    turmoil.rulingParty = new Reds();
    PoliticalAgendas.setNextAgenda(turmoil, game);

    // Raising to 0
    setTemperature(game, -2);

    player.megaCredits = card.cost + 8;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 9;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 9});
  });

  it('canPlay: reds tax applies by default when placing oceans', () => {
    // ArtificialLake uses trSource.
    const card = new ArtificialLake();
    const [game, player] = testGame(1, {turmoilExtension: true});
    const turmoil = Turmoil.getTurmoil(game);
    setTemperature(game, -6); // minimum requirement for the card.
    game.phase = Phase.ACTION;

    turmoil.rulingParty = new Greens();
    PoliticalAgendas.setNextAgenda(turmoil, game);
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.true;

    turmoil.rulingParty = new Reds();
    PoliticalAgendas.setNextAgenda(turmoil, game);
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.false;

    player.megaCredits = card.cost + 3;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 3});

    maxOutOceans(player);
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.true;
  });

  it('canPlay: reds tax applies for multi-TR card', () => {
    // TowingAComet raises oxygen 1 step AND places 1 ocean, each costing 3 M€ reds tax.
    const card = new TowingAComet();
    const [game, player] = testGame(1, {turmoilExtension: true});
    const turmoil = Turmoil.getTurmoil(game);
    game.phase = Phase.ACTION;

    turmoil.rulingParty = new Reds();
    PoliticalAgendas.setNextAgenda(turmoil, game);

    player.megaCredits = card.cost + 5;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 6;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 6});

    // When oxygen is already maxed, only the ocean costs reds.
    setOxygenLevel(game, constants.MAX_OXYGEN_LEVEL);
    player.megaCredits = card.cost + 2;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 3;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 3});
  });

  it('canPlay: reds tax applies by default when raising the venus scale.', () => {
    // GiantSolarShade raises venus three steps.
    const card = new GiantSolarShade();
    const [game, player] = testGame(1, {turmoilExtension: true});
    const turmoil = Turmoil.getTurmoil(game);
    game.phase = Phase.ACTION;

    turmoil.rulingParty = new Greens();
    PoliticalAgendas.setNextAgenda(turmoil, game);
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.true;

    turmoil.rulingParty = new Reds();
    PoliticalAgendas.setNextAgenda(turmoil, game);
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.false;

    player.megaCredits = card.cost + 8;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 9;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 9});

    // Set Venus so it only raises one step.
    setVenusScaleLevel(game, constants.MAX_VENUS_SCALE - 2);

    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 3;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 3});

    setVenusScaleLevel(game, constants.MAX_VENUS_SCALE);

    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.true;
  });

  it('canPlay: when paying reds tax for venus, include the cost for the 16% TR', () => {
    // GiantSolarShade raises venus three steps.
    const card = new GiantSolarShade();
    const [game, player] = testGame(1, {turmoilExtension: true});
    const turmoil = Turmoil.getTurmoil(game);
    game.phase = Phase.ACTION;

    turmoil.rulingParty = new Reds();
    PoliticalAgendas.setNextAgenda(turmoil, game);

    // Raising to or above 16%
    setVenusScaleLevel(game, 14);

    player.megaCredits = card.cost + 11;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 12;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 12});
  });

  it('canPlay: reds tax applies by default when raising moon habitat rate', () => {
    // Raises the colony rate two steps.
    const card = new WaterTreatmentComplex();
    const [game, player] = testGame(1, {turmoilExtension: true, moonExpansion: true});
    const turmoil = Turmoil.getTurmoil(game);
    const moonData = MoonExpansion.moonData(game);
    game.phase = Phase.ACTION;

    // Card requirements.
    moonData.moon.getAvailableSpacesOnLand(player)[0].tile = {tileType: TileType.MOON_HABITAT};
    player.titanium = 1;

    turmoil.rulingParty = new Greens();
    PoliticalAgendas.setNextAgenda(turmoil, game);
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.true;

    turmoil.rulingParty = new Reds();
    PoliticalAgendas.setNextAgenda(turmoil, game);
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.false;

    player.megaCredits = card.cost + 5;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 6;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 6});

    moonData.habitatRate = 7;
    player.megaCredits = card.cost + 2;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 3;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 3});

    moonData.habitatRate = 8;

    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.true;
  });

  it('canPlay: reds tax applies by default when raising moon mining rate', () => {
    // Raises the mining rate two steps.
    const card = new DarksideMeteorBombardment();
    const [game, player] = testGame(1, {turmoilExtension: true, moonExpansion: true});
    const turmoil = Turmoil.getTurmoil(game);
    const moonData = MoonExpansion.moonData(game);
    game.phase = Phase.ACTION;

    turmoil.rulingParty = new Greens();
    PoliticalAgendas.setNextAgenda(turmoil, game);
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.true;

    turmoil.rulingParty = new Reds();
    PoliticalAgendas.setNextAgenda(turmoil, game);
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.false;

    player.megaCredits = card.cost + 5;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 6;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 6});

    moonData.miningRate = 7;
    player.megaCredits = card.cost + 2;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 3;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 3});

    moonData.miningRate = 8;

    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.true;
  });

  it('canPlay: reds tax applies by default when raising moon logistic rate', () => {
    // Raises the logistic rate two steps.
    const card = new LunaStagingStation();
    const [game, player] = testGame(1, {turmoilExtension: true, moonExpansion: true});
    const turmoil = Turmoil.getTurmoil(game);
    const moonData = MoonExpansion.moonData(game);
    game.phase = Phase.ACTION;

    // Card requirements
    moonData.logisticRate = 2;
    player.titanium = 1;

    turmoil.rulingParty = new Greens();
    PoliticalAgendas.setNextAgenda(turmoil, game);
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.true;

    turmoil.rulingParty = new Reds();
    PoliticalAgendas.setNextAgenda(turmoil, game);
    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.false;

    player.megaCredits = card.cost + 5;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 6;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 6});

    moonData.logisticRate = 7;
    player.megaCredits = card.cost + 2;
    expect(player.canPlay(card)).is.false;
    player.megaCredits = card.cost + 3;
    expect(player.canPlay(card)).is.true;
    expect(card.additionalProjectCosts).deep.eq({redsCost: 3});

    moonData.logisticRate = 8;

    player.megaCredits = card.cost;
    expect(player.canPlay(card)).is.true;
  });

  it('Reds: Cannot raise TR directly without the money to back it up', () => {
    const [game, player] = testGame(1, {turmoilExtension: true, moonExpansion: true});
    const turmoil = Turmoil.getTurmoil(game);
    game.phase = Phase.ACTION;

    turmoil.rulingParty = new Reds();
    PoliticalAgendas.setNextAgenda(turmoil, game);

    expect(player.terraformRating).eq(14);

    player.megaCredits = 2;
    player.increaseTerraformRating();
    runAllActions(game);

    expect(player.megaCredits).eq(2); // No change
    expect(player.terraformRating).eq(14);

    player.megaCredits = 3;
    player.increaseTerraformRating();
    // Possibly remove the requirement to runAllActions if the play is only paying with MC
    runAllActions(game);

    expect(player.megaCredits).eq(0);
    expect(player.terraformRating).eq(15);

    player.megaCredits = 3;
    player.increaseTerraformRating(2);
    runAllActions(game);

    expect(player.megaCredits).eq(3); // No change
    expect(player.terraformRating).eq(15);

    player.megaCredits = 5;
    player.increaseTerraformRating(2);
    runAllActions(game);

    expect(player.megaCredits).eq(5); // No change
    expect(player.terraformRating).eq(15);

    player.megaCredits = 6;
    player.increaseTerraformRating(2);
    runAllActions(game);

    expect(player.megaCredits).eq(0);
    expect(player.terraformRating).eq(17);

    // This doesn't apply outside of the ACTION phase
    game.phase = Phase.SOLAR;

    player.megaCredits = 6;
    player.increaseTerraformRating(2);
    runAllActions(game);

    expect(player.megaCredits).eq(6);
    expect(player.terraformRating).eq(19);
  });

  it('deserialization', () => {
    const [bluePlayer, redPlayer, greenPlayer] = [
      TestPlayer.BLUE.newPlayer(),
      TestPlayer.RED.newPlayer(),
      TestPlayer.GREEN.newPlayer(),
    ];

    const players = [bluePlayer, redPlayer, greenPlayer];

    const json = {
      'chairman': 'NEUTRAL',
      'rulingParty': 'Greens',
      'dominantParty': 'Unity',
      'usedFreeDelegateAction': ['p-blue-id'],
      'delegateReserve': ['p-blue-id', 'p-red-id', 'p-green-id', 'NEUTRAL', 'NEUTRAL'],
      'parties': [
        {'name': 'Mars First', 'delegates': []},
        {'name': 'Scientists', 'delegates': []},
        {'name': 'Unity', 'delegates': ['NEUTRAL'], 'partyLeader': 'NEUTRAL'},
        {'name': 'Greens', 'delegates': ['NEUTRAL'], 'partyLeader': 'NEUTRAL'},
        {'name': 'Reds', 'delegates': []},
        {'name': 'Kelvinists', 'delegates': []},
      ],
      'playersInfluenceBonus': [],
      'globalEventDealer': {
        'deck': [
          'Solar Flare',
          'Spin-Off Products',
          'Dry Deserts',
          'Mud Slides',
          'Productivity'],
        'discarded': ['Pandemic']},
      'distantGlobalEvent': 'Eco Sabotage',
      'comingGlobalEvent': 'Celebrity Leaders',
      'politicalAgendasData': {
        'thisAgenda': {
          'bonusId': 'none', 'policyId': 'none',
        },
        'agendas': [],
        'agendaStyle': 'Random',
      },
    } as SerializedTurmoil;
    const s: SerializedTurmoil = JSON.parse(JSON.stringify(json));
    const t = Turmoil.deserialize(s, players);

    expect(t.distantGlobalEvent!.name).eq('Eco Sabotage');
    expect(t.distantGlobalEvent!.revealedDelegate).eq('Greens');
    expect(t.comingGlobalEvent!.name).eq('Celebrity Leaders');
    expect(t.comingGlobalEvent!.revealedDelegate).eq('Unity');
    expectDelegateMatch(t.delegateReserve, bluePlayer, redPlayer, greenPlayer, 'NEUTRAL', 'NEUTRAL');
    expect(t.usedFreeDelegateAction).deep.eq(new Set([bluePlayer]));
  });

  function setRulingParty(turmoil: Turmoil, game: IGame, party: IParty) {
    turmoil.rulingParty = party;
    PoliticalAgendas.setNextAgenda(turmoil, game);
  }

  function expectDelegateMatch(actual: MultiSet<Delegate>, ...delegates: Array<Delegate>) {
    expect(actual).to.deep.eq(MultiSet.from(delegates));
  }

  function expectLog(message: string, partyName?: PartyName) {
    const log = game.gameLog.find((messageLog) =>
      messageLog.message === message &&
      (partyName === undefined || messageLog.data[2]?.value === partyName));
    expect(log).is.not.undefined;
  }
});
