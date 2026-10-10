import {expect} from 'chai';
import {CardName} from '@/common/cards/CardName';
import {SpaceBonus} from '@/common/boards/SpaceBonus';
import {PartyName} from '@/common/turmoil/PartyName';
import {Phase} from '@/common/Phase';
import {cast} from '@/common/utils/utils';
import {Game} from '@/server/Game';
import {GameCards} from '@/server/GameCards';
import {DEFAULT_GAME_OPTIONS} from '@/server/game/GameOptions';
import {newCard, newProjectCard, newPrelude} from '@/server/createCard';
import {CardType} from '@/common/cards/CardType';
import {SpaceType} from '@/common/boards/SpaceType';
import {TileType} from '@/common/TileType';
import {REBALANCED_CARD_MANIFEST} from '@/server/cards/rebalanced/RebalancedCardManifest';
import {CardManifest} from '@/server/cards/ModuleManifest';
import {isCompatibleWith} from '@/server/cards/CardFactorySpec';
import {ICard} from '@/server/cards/ICard';
import {Poseidon} from '@/server/cards/colonies/Poseidon';
import {PoseidonRebalanced} from '@/server/cards/rebalanced/PoseidonRebalanced';
import {PioneerSettlement} from '@/server/cards/colonies/PioneerSettlement';
import {MinorityRefuge} from '@/server/cards/colonies/MinorityRefuge';
import {VitorRebalanced} from '@/server/cards/rebalanced/VitorRebalanced';
import {TharsisRepublicRebalanced} from '@/server/cards/rebalanced/TharsisRepublicRebalanced';
import {ImmigrantCity} from '@/server/cards/base/ImmigrantCity';
import {ViralEnhancersRebalanced} from '@/server/cards/rebalanced/ViralEnhancersRebalanced';
import {Moss} from '@/server/cards/base/Moss';
import {NitrophilicMoss} from '@/server/cards/base/NitrophilicMoss';
import {Potatoes} from '@/server/cards/promo/Potatoes';
import {GuerillaEcologists} from '@/server/cards/underworld/GuerillaEcologists';
import {Microbitic} from '@/server/cards/sillyfication/Microbitic';
import {MiningGuildRebalanced} from '@/server/cards/rebalanced/MiningGuildRebalanced';
import {SurveyMission} from '@/server/cards/pathfinders/SurveyMission';
import {AdhaiHighOrbitConstructions} from '@/server/cards/pathfinders/AdhaiHighOrbitConstructions';
import {BuildColonyStandardProjectRebalanced} from '@/server/cards/rebalanced/BuildColonyStandardProjectRebalanced';
import {FloaterLeasingRebalanced} from '@/server/cards/rebalanced/FloaterLeasingRebalanced';
import {Celestic} from '@/server/cards/venusNext/Celestic';
import {CelesticRebalanced} from '@/server/cards/rebalanced/CelesticRebalanced';
import {AtmosphericEnhancers} from '@/server/cards/prelude2/AtmosphericEnhancers';
import {StormCraftIncorporatedRebalanced} from '@/server/cards/rebalanced/StormCraftIncorporatedRebalanced';
import {AphroditeRebalanced} from '@/server/cards/rebalanced/AphroditeRebalanced';
import {RotatorImpactsRebalanced} from '@/server/cards/rebalanced/RotatorImpactsRebalanced';
import {SabotageRebalanced} from '@/server/cards/rebalanced/SabotageRebalanced';
import {ValleyTrust} from '@/server/cards/prelude/ValleyTrust';
import {SelectCard} from '@/server/inputs/SelectCard';
import {Ceres} from '@/server/colonies/Ceres';
import {Luna} from '@/server/colonies/Luna';
import {SelectColony} from '@/server/inputs/SelectColony';
import {SelectSpace} from '@/server/inputs/SelectSpace';
import {testGame} from '../../TestGame';
import {churn, runAllActions, setRulingParty, setVenusScaleLevel} from '../../TestingUtils';
import reference from './reference.json';

describe('Rebalanced integration contracts', () => {
  for (const Card of [PioneerSettlement, MinorityRefuge]) {
    it(`${Card.name} builds an ordinary colony at the production floor without a free clamp gain`, () => {
      const [game, player] = testGame(2, {coloniesExtension: true});
      const ceres = new Ceres();
      game.colonies = [ceres, new Luna()];
      player.playedCards.push(new PoseidonRebalanced());
      player.production.megacredits = -5;
      const card = new Card();
      expect(card.canPlay(player)).is.true;
      const input = cast(churn(card.play(player), player), SelectColony);
      expect(input.colonies).includes(ceres);
      input.cb(ceres);
      runAllActions(game);
      expect(player.production.megacredits).eq(-5);
      expect(ceres.colonies).deep.eq([player.id]);
    });

    it(`${Card.name} predicts only personal bonuses and offers only actually playable affordable targets`, () => {
      const [game, player, opponent] = testGame(2, {coloniesExtension: true});
      const ceres = new Ceres();
      const luna = new Luna();
      const inactive = new Ceres();
      inactive.isActive = false;
      const full = new Ceres();
      full.colonies = [opponent.id, opponent.id, opponent.id];
      const owned = new Ceres();
      owned.colonies = [player.id];
      game.colonies = [ceres, luna, inactive, full, owned];
      opponent.playedCards.push(new PoseidonRebalanced());
      player.production.megacredits = -4;
      const card = new Card();
      expect(card.canPlay(player)).is.true;
      const input = cast(churn(card.play(player), player), SelectColony);
      expect(input.colonies).deep.eq([luna]);
      input.cb(luna);
      runAllActions(game);
      expect(player.production.megacredits).eq(-4);
      expect(opponent.production.megacredits).eq(0);
      luna.isActive = false;
      expect(new Card().canPlay(player)).is.false;
    });

    it(`${Card.name} retains original Poseidon's one-step prediction and callback`, () => {
      const [game, player] = testGame(2, {coloniesExtension: true});
      const ceres = new Ceres();
      game.colonies = [ceres];
      player.playedCards.push(new Poseidon());
      player.production.megacredits = -4;
      const card = new Card();
      expect(card.canPlay(player)).is.true;
      cast(churn(card.play(player), player), SelectColony).cb(ceres);
      runAllActions(game);
      expect(player.production.megacredits).eq(-5);
    });
  }

  it('keeps Pioneer Settlement maximum-one-colony restriction', () => {
    const [game, player] = testGame(2, {coloniesExtension: true});
    const ceres = new Ceres();
    ceres.colonies = [player.id, player.id];
    game.colonies = [ceres, new Luna()];
    player.playedCards.push(new PoseidonRebalanced());
    expect(new PioneerSettlement().canPlay(player)).is.false;
  });

  for (const solo of [false, true]) {
    it(`skips Vitor Rebalanced's unavailable initial action (${solo ? 'solo' : 'all awards funded'})`, () => {
      const [game, player] = testGame(solo ? 1 : 2);
      const vitor = new VitorRebalanced();
      player.playedCards.push(vitor);
      player.pendingInitialActions.push(vitor);
      if (!solo) {
        game.awards.slice(0, 3).forEach((award) => game.fundAward(player, award));
      }
      player.takeAction(false);
      expect(player.pendingInitialActions).is.empty;
    });
  }

  it('uses the real city bonus to admit and pay Immigrant City at the production floor', () => {
    const [game, player] = testGame(2);
    player.playedCards.push(new TharsisRepublicRebalanced());
    player.production.override({energy: 1, megacredits: -5});
    const card = new ImmigrantCity();
    expect(card.canPlay(player)).is.true;
    player.playCard(card);
    runAllActions(game);
    const input = cast(player.popWaitingFor(), SelectSpace);
    input.cb(input.spaces[0]);
    runAllActions(game);
    expect(player.production.megacredits).eq(-5);
    expect(player.production.energy).eq(0);
    expect(player.megaCredits).at.least(3);
  });

  for (const [Card, plants, production] of [
    [Moss, 0, 1], [NitrophilicMoss, 1, 2], [Potatoes, 1, 0], [GuerillaEcologists, 3, 0], [Microbitic, 1, 2],
  ] as const) {
    it(`uses Viral Enhancers Rebalanced's plant prediction for ${Card.name} and restores the real plant balance`, () => {
      const [game, player] = testGame(2, {underworldExpansion: true});
      player.playedCards.push(new ViralEnhancersRebalanced());
      game.board.spaces.filter((space) => space.spaceType === SpaceType.OCEAN).slice(0, 3)
        .forEach((space) => space.tile = {tileType: TileType.OCEAN});
      player.underworldData.corruption = 1;
      player.plants = plants;
      const card = new Card();
      expect(card.canPlay(player)).is.true;
      player.playCard(card);
      runAllActions(game);
      if (Card === GuerillaEcologists) {
        const input = cast(player.popWaitingFor(), SelectSpace);
        input.cb(input.spaces[0]);
        runAllActions(game);
      }
      expect(player.plants).eq(0);
      expect(player.production.plants).eq(production);
    });
  }

  it('grants Mining Guild Rebalanced titanium production for a Survey Mission claim', () => {
    const [game, player] = testGame(2, {pathfindersExpansion: true});
    player.playedCards.push(new MiningGuildRebalanced());
    const input = cast(new SurveyMission().play(player), SelectSpace);
    const space = input.spaces[0];
    space.bonus = [SpaceBonus.TITANIUM];
    input.cb(space);
    runAllActions(game);
    expect(player.production.titanium).eq(1);
    expect(player.production.steel).eq(0);
    expect(player.titanium).eq(1);
  });

  it('does not trigger a Mining Guild placement-bonus claim when a protected hazard grants no bonus', () => {
    const [game, player] = testGame(2, {pathfindersExpansion: true});
    player.playedCards.push(new MiningGuildRebalanced());
    const space = game.board.getNonReservedLandSpaces()[0];
    space.tile = {tileType: TileType.DUST_STORM_MILD, protectedHazard: true};
    space.bonus = [SpaceBonus.TITANIUM];
    const input = cast(new SurveyMission().play(player), SelectSpace);
    expect(input.spaces).includes(space);
    input.cb(space);
    runAllActions(game);
    expect(player.production.titanium).eq(0);
    expect(player.titanium).eq(0);
  });

  it('applies Adhai orbitals to the actual Rebalanced colony standard project', () => {
    const [, player] = testGame(2, {coloniesExtension: true});
    const adhai = new AdhaiHighOrbitConstructions();
    adhai.resourceCount = 4;
    player.playedCards.push(adhai);
    expect(new BuildColonyStandardProjectRebalanced().getAdjustedCost(player)).eq(15);
  });

  for (const Card of [Celestic, CelesticRebalanced, StormCraftIncorporatedRebalanced]) {
    it(`${Card.name} draws a new floater-icon card without giving Stormcraft heat conversion`, () => {
      const [game, player] = testGame(2, {venusNextExtension: true});
      const floater = new FloaterLeasingRebalanced();
      game.projectDeck.drawPile = [newProjectCard(CardName.ADAPTED_LICHEN)!, floater];
      const card = new Card();
      player.defer(card.initialAction(player));
      runAllActions(game);
      expect(player.cardsInHand).includes(floater);
      if (Card === StormCraftIncorporatedRebalanced) {
        player.playedCards.push(card);
        card.resourceCount = 4;
        expect(card.resourceType).is.undefined;
        expect(player.availableHeat()).eq(0);
      }
    });
  }

  it('Atmospheric Enhancers draws a new floater-icon card', () => {
    const [game, player] = testGame(2, {venusNextExtension: true});
    const floater = new FloaterLeasingRebalanced();
    game.projectDeck.drawPile = [newProjectCard(CardName.ADAPTED_LICHEN)!, floater];
    new AtmosphericEnhancers().bespokePlay(player);
    expect(player.cardsInHand).includes(floater);
  });

  it('uses the shared generation descriptor for Sabotage without global requirement bonuses', () => {
    const [game, player] = testGame(2);
    const card = new SabotageRebalanced();
    player.playedCards.push(newCard(CardName.ADAPTATION_TECHNOLOGY));
    expect(card.requirements).deep.eq([{generation: 5, count: 5}]);
    for (const generation of [4, 5, 6]) {
      game.generation = generation;
      expect(card.canPlay(player)).eq(generation >= 5);
    }
  });

  for (const ownerIsActor of [true, false]) {
    it(`uses Aphrodite's actual Venus income for Reds availability and payment (${ownerIsActor ? 'owner' : 'opponent'})`, () => {
      const [game, player, opponent] = testGame(2, {venusNextExtension: true, turmoilExtension: true});
      game.phase = Phase.ACTION;
      setVenusScaleLevel(game, 0);
      setRulingParty(game, PartyName.REDS);
      (ownerIsActor ? player : opponent).playedCards.push(new AphroditeRebalanced());
      const rotator = new RotatorImpactsRebalanced();
      rotator.resourceCount = 1;
      player.playedCards.push(rotator);
      player.megaCredits = ownerIsActor ? 0 : 1;
      expect(rotator.canAct(player)).is.true;
      rotator.action(player);
      runAllActions(game);
      expect(rotator.resourceCount).eq(0);
      expect(game.getVenusScaleLevel()).eq(2);
      expect(player.megaCredits).eq(ownerIsActor ? 2 : 0);
      expect(opponent.megaCredits).eq(ownerIsActor ? 0 : 3);
    });

    it(`reserves both Reds TR payments at the Venus bonus threshold (${ownerIsActor ? 'owner' : 'opponent'})`, () => {
      const [game, player, opponent] = testGame(2, {venusNextExtension: true, turmoilExtension: true});
      game.phase = Phase.ACTION;
      setVenusScaleLevel(game, 14);
      setRulingParty(game, PartyName.REDS);
      (ownerIsActor ? player : opponent).playedCards.push(new AphroditeRebalanced());
      const rotator = new RotatorImpactsRebalanced();
      rotator.resourceCount = 1;
      player.playedCards.push(rotator);
      player.megaCredits = 0;
      expect(rotator.canAct(player)).is.false;
      expect(rotator.resourceCount).eq(1);
      player.megaCredits = ownerIsActor ? 1 : 4;
      expect(rotator.canAct(player)).is.true;
      const tr = player.terraformRating;
      rotator.action(player);
      runAllActions(game);
      expect(rotator.resourceCount).eq(0);
      expect(player.terraformRating).eq(tr + 2);
      expect(player.megaCredits).eq(0);
      expect(game.getVenusScaleLevel()).eq(16);
    });
  }
});

describe('Rebalanced catalogue and saved games', () => {
  it('preserves the complete Valley Trust fallback deck without an initial Prelude deal', () => {
    const [game, player] = testGame(2, {rebalancedExpansion: true, preludeExtension: false});
    expect(game.preludeDeck.drawPile).has.length(35);
    expect(player.dealtPreludeCards).is.empty;
    expect(game.preludeDeck.drawPile.map((card) => card.name)).includes(CardName.AQUIFER_TURBINES).and.includes(CardName.DONATION_REBALANCED).and.not.includes(CardName.DONATION);
    const input = cast(new ValleyTrust().initialAction(player), SelectCard);
    expect(input.cards).has.length(3);
    expect(game.preludeDeck.drawPile).has.length(32);
  });

  it('does not expand explicitly selected Prelude pools', () => {
    const options = {...DEFAULT_GAME_OPTIONS, rebalancedExpansion: true, customPreludes: [CardName.DONATION_REBALANCED]};
    expect(new GameCards(options).getPreludeCards().map((card) => card.name)).deep.eq([CardName.DONATION_REBALANCED]);
  });

  it('registers exactly the 113 active published IDs and five combined IDs', () => {
    const manifest = REBALANCED_CARD_MANIFEST;
    const manifests: Array<CardManifest<ICard>> = [manifest.projectCards, manifest.corporationCards, manifest.preludeCards, manifest.standardProjects];
    const names = manifests.flatMap(CardManifest.keys);
    const combined = [CardName.EARLY_SETTLEMENT_REBALANCED_BETTER_MARS, CardName.SELF_SUFFICIENT_SETTLEMENT_REBALANCED_BETTER_MARS,
      CardName.PRISTAR_REBALANCED_BETTER_MARS, CardName.MARTIAN_RAILS_REBALANCED_BETTER_MARS, CardName.TROPICAL_RESORT_REBALANCED_BETTER_MARS];
    expect(names).has.length(118);
    expect(new Set(names).size).eq(118);
    expect(names).has.members([...reference.cards.map((card) => card.name), ...combined]);
  });

  it('preserves exactly the 17 explicit public dependencies without gating the other 96 by their original pack', () => {
    const manifests: Array<CardManifest<ICard>> = [REBALANCED_CARD_MANIFEST.projectCards, REBALANCED_CARD_MANIFEST.corporationCards,
      REBALANCED_CARD_MANIFEST.preludeCards, REBALANCED_CARD_MANIFEST.standardProjects];
    const factories = manifests.flatMap(CardManifest.entries);
    const modules = {Venus: 'venus', Colonies: 'colonies', Turmoil: 'turmoil'} as const;
    let dependencyCount = 0;
    for (const source of reference.cards) {
      const factory = factories.find(([name]) => name === source.name)![1];
      if (source.compatibility === null) {
        expect(factory.compatibility, source.symbol).is.undefined;
        expect(isCompatibleWith(factory, DEFAULT_GAME_OPTIONS), source.symbol).is.true;
      } else {
        dependencyCount++;
        const dependency = source.compatibility.split('.').pop()! as keyof typeof modules;
        expect(factory.compatibility, source.symbol).deep.eq([modules[dependency]]);
        expect(isCompatibleWith(factory, {...DEFAULT_GAME_OPTIONS, venusNextExtension: false, coloniesExtension: false, turmoilExtension: false}), source.symbol).is.false;
        expect(isCompatibleWith(factory, {...DEFAULT_GAME_OPTIONS, venusNextExtension: true, coloniesExtension: true, turmoilExtension: true}), source.symbol).is.true;
      }
    }
    expect(dependencyCount).eq(17);
  });

  it('checks top-level combination flags and dependencies for force-included new variants', () => {
    const options = {...DEFAULT_GAME_OPTIONS, rebalancedExpansion: true, includedCards: [CardName.FLOATER_LEASING_REBALANCED, CardName.TROPICAL_RESORT_REBALANCED_BETTER_MARS]};
    const names = new GameCards(options).getProjectCards().map((card) => card.name);
    expect(names).not.includes(CardName.FLOATER_LEASING_REBALANCED).and.not.includes(CardName.TROPICAL_RESORT_REBALANCED_BETTER_MARS);
    const enabled = new GameCards({...options, venusNextExtension: true, betterMarsExpansion: true, pathfindersExpansion: true}).getProjectCards().map((card) => card.name);
    expect(enabled).includes(CardName.FLOATER_LEASING_REBALANCED).and.includes(CardName.TROPICAL_RESORT_REBALANCED_BETTER_MARS);
    const disabled = new GameCards({...options, rebalancedExpansion: false}).getProjectCards().map((card) => card.name);
    expect(disabled).not.includes(CardName.FLOATER_LEASING_REBALANCED);
  });

  it('keeps old saved hands loadable after Rebalanced is enabled', () => {
    const [game, player] = testGame(2, {rebalancedExpansion: true});
    player.cardsInHand = [newProjectCard(CardName.MARS_UNIVERSITY)!];
    player.playedCards.push(newCard(CardName.THORGATE));
    const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())), {viewOnly: true});
    expect(restored.players[0].cardsInHand[0].name).eq(CardName.MARS_UNIVERSITY);
    expect(restored.players[0].tableau.get(CardName.THORGATE)?.name).eq(CardName.THORGATE);
  });

  it('reloads all 112 persistable published new IDs through the actual registry', () => {
    const [game, player] = testGame(2, {rebalancedExpansion: true, venusNextExtension: true, coloniesExtension: true, turmoilExtension: true});
    const names = reference.cards.filter((card) => card.type !== 'standard_project').map((card) => card.name as CardName);
    for (const name of names) {
      const card = newCard(name);
      card.resourceCount = 3;
      player.playedCards.push(card);
    }
    player.cardsInHand = [newProjectCard(CardName.WARP_DRIVE_REBALANCED)!];
    player.preludeCardsInHand = [newPrelude(CardName.EARLY_SETTLEMENT_REBALANCED)!];
    player.pendingInitialActions = player.tableau.corporations().filter((card) => card.initialActionText !== undefined);
    const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())), {viewOnly: true});
    expect(restored.players[0].playedCards.asArray().map((card) => card.name)).deep.eq(names);
    expect(restored.players[0].playedCards.asArray().map((card) => card.resourceCount)).deep.eq(names.map(() => 3));
    expect(restored.players[0].cardsInHand[0].name).eq(CardName.WARP_DRIVE_REBALANCED);
    expect(restored.players[0].preludeCardsInHand[0].name).eq(CardName.EARLY_SETTLEMENT_REBALANCED);
    expect(restored.players[0].pendingInitialActions.map((card) => card.name)).deep.eq(player.pendingInitialActions.map((card) => card.name));
  });

  for (const rebalancedExpansion of [false, true]) {
    for (const betterMarsExpansion of [false, true]) {
      it(`creates and reloads a real four-Prelude opening (${rebalancedExpansion}/${betterMarsExpansion}) without duplicate versions`, () => {
        const [game, player] = testGame(2, {rebalancedExpansion, betterMarsExpansion, preludeExtension: true, prelude2Expansion: true,
          pathfindersExpansion: true, turmoilExtension: true, skipInitialCardSelection: false});
        expect(player.dealtPreludeCards).has.length(4);
        const names = [...game.preludeDeck.drawPile, ...game.players.flatMap((p) => p.dealtPreludeCards)].map((card) => card.name);
        expect(new Set(names).size).eq(names.length);
        const versions = [CardName.EARLY_SETTLEMENT, CardName.EARLY_SETTLEMENT_BETTER_MARS, CardName.EARLY_SETTLEMENT_REBALANCED, CardName.EARLY_SETTLEMENT_REBALANCED_BETTER_MARS];
        expect(names.filter((name) => versions.includes(name))).has.length(1);
        const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())), {viewOnly: true});
        expect(restored.gameOptions.rebalancedExpansion).eq(rebalancedExpansion);
        expect(restored.gameOptions.betterMarsExpansion).eq(betterMarsExpansion);
        expect(restored.players[0].dealtPreludeCards.map((card) => card.name)).deep.eq(player.dealtPreludeCards.map((card) => card.name));
      });
    }
  }

  it('resolves the designed-microorganisms spelling alias and the colony standard project', () => {
    expect(newCard(CardName.DESIGNED_MICRO_ORGANISMS_REBALANCED).name).eq(CardName.DESIGNED_MICRO_ORGANISMS_REBALANCED);
    const projects = new GameCards({...DEFAULT_GAME_OPTIONS, rebalancedExpansion: true, coloniesExtension: true}).getStandardProjects();
    expect(projects.find((card) => card.name === CardName.BUILD_COLONY_STANDARD_PROJECT_REBALANCED)?.type).eq(CardType.STANDARD_PROJECT);
  });
});
