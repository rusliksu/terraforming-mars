import {expect} from 'chai';
import {CardName} from '@/common/cards/CardName';
import {Tag} from '@/common/cards/Tag';
import {TileType} from '@/common/TileType';
import {GameCards} from '@/server/GameCards';
import {DEFAULT_GAME_OPTIONS} from '@/server/game/GameOptions';
import {newCard, newCorporationCard, newPrelude, newProjectCard} from '@/server/createCard';
import {isIActionCard} from '@/server/cards/ICard';
import {Game} from '@/server/Game';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {EmptyBoard} from '../../testing/EmptyBoard';
import {assertPlaceCity} from '../../assertions';
import reference from './reference.json';

const both = {...DEFAULT_GAME_OPTIONS, rebalancedExpansion: true, betterMarsExpansion: true,
  preludeExtension: true, pathfindersExpansion: true, turmoilExtension: true};
const families = [
  [CardName.EARLY_SETTLEMENT, CardName.EARLY_SETTLEMENT_BETTER_MARS, CardName.EARLY_SETTLEMENT_REBALANCED, CardName.EARLY_SETTLEMENT_REBALANCED_BETTER_MARS],
  [CardName.SELF_SUFFICIENT_SETTLEMENT, CardName.SELF_SUFFICIENT_SETTLEMENT_BETTER_MARS, CardName.SELF_SUFFICIENT_SETTLEMENT_REBALANCED, CardName.SELF_SUFFICIENT_SETTLEMENT_REBALANCED_BETTER_MARS],
  [CardName.PRISTAR, CardName.PRISTAR_BETTER_MARS, CardName.PRISTAR_REBALANCED, CardName.PRISTAR_REBALANCED_BETTER_MARS],
  [CardName.MARTIAN_RAILS, CardName.MARTIAN_RAILS_BETTER_MARS, CardName.MARTIAN_RAILS_REBALANCED, CardName.MARTIAN_RAILS_REBALANCED_BETTER_MARS],
  [CardName.TROPICAL_RESORT, CardName.TROPICAL_RESORT_BETTER_MARS, CardName.TROPICAL_RESORT_REBALANCED, CardName.TROPICAL_RESORT_REBALANCED_BETTER_MARS],
];

describe('Rebalanced and Better Mars combinations', () => {
  for (const rebalancedExpansion of [false, true]) {
    for (const betterMarsExpansion of [false, true]) {
      it(`selects exactly one compatible version in all three pools (${rebalancedExpansion}/${betterMarsExpansion})`, () => {
        const cards = new GameCards({...both, rebalancedExpansion, betterMarsExpansion});
        const names = [...cards.getProjectCards(), ...cards.getCorporationCards(), ...cards.getPreludeCards()].map((card) => card.name);
        const expectedIndex = Number(betterMarsExpansion) + 2 * Number(rebalancedExpansion);
        for (const family of families) {
          expect(names.filter((name) => family.includes(name))).deep.eq([family[expectedIndex]]);
        }
      });
    }
  }

  it('selects combined endpoints in manual lists without intermediate variants', () => {
    const options = {...both,
      customCorporationsList: [CardName.PRISTAR, CardName.PRISTAR_REBALANCED_BETTER_MARS],
      customPreludes: [CardName.EARLY_SETTLEMENT, CardName.EARLY_SETTLEMENT_REBALANCED_BETTER_MARS]};
    expect(new GameCards(options).getCorporationCards().map((card) => card.name)).deep.eq([CardName.PRISTAR_REBALANCED_BETTER_MARS]);
    expect(new GameCards(options).getPreludeCards().map((card) => card.name)).deep.eq([CardName.EARLY_SETTLEMENT_REBALANCED_BETTER_MARS]);
  });

  it('uses Rebalanced effects and exact Better Mars tags for the two city preludes', () => {
    for (const [name, plants, megacredits, plantProduction, mcProduction] of [
      [CardName.EARLY_SETTLEMENT_REBALANCED_BETTER_MARS, 3, 0, 1, 0],
      [CardName.SELF_SUFFICIENT_SETTLEMENT_REBALANCED_BETTER_MARS, 0, 3, 0, 2],
    ] as const) {
      const [game, player] = testGame(2);
      game.board = EmptyBoard.newInstance();
      const card = newPrelude(name)!;
      expect(card.tags).deep.eq([Tag.BUILDING, Tag.CITY, Tag.MARS]);
      player.defer(card.play(player));
      runAllActions(game);
      assertPlaceCity(player, player.popWaitingFor());
      runAllActions(game);
      expect(player.plants).eq(plants);
      expect(player.megaCredits).eq(megacredits);
      expect(player.production.plants).eq(plantProduction);
      expect(player.production.megacredits).eq(mcProduction);
    }
  });

  it('preserves Pristar preservation, TR and influence with the Mars tag', () => {
    const [game, player] = testGame(2, {turmoilExtension: true});
    const card = newCorporationCard(CardName.PRISTAR_REBALANCED_BETTER_MARS)!;
    expect(card.tags).deep.eq([Tag.MARS]);
    expect(card.startingMegaCredits).eq(53);
    const tr = player.terraformRating;
    card.play(player);
    expect(player.terraformRating).eq(tr - 2);
    player.hasIncreasedTerraformRatingThisGeneration = false;
    card.onProductionPhase?.(player);
    runAllActions(game);
    expect(card.resourceCount).eq(1);
    expect(card.getVictoryPoints(player)).eq(1);
    expect(player.megaCredits).eq(6);
    expect(card.getInfluenceBonus?.(player)).eq(1);
  });

  it('preserves Martian Rails cost and actual city-count action with the Mars tag', () => {
    const [game, player] = testGame(2);
    game.board = EmptyBoard.newInstance();
    game.board.getSpaceOrThrow('04').tile = {tileType: TileType.CITY};
    game.board.getSpaceOrThrow('10').tile = {tileType: TileType.CITY};
    const card = newProjectCard(CardName.MARTIAN_RAILS_REBALANCED_BETTER_MARS)!;
    expect(card.tags).deep.eq([Tag.BUILDING, Tag.MARS]);
    expect(card.cost).eq(12);
    player.energy = 1;
    if (!isIActionCard(card)) {
      throw new Error('Expected the real Rails action');
    }
    expect(card.canAct(player)).is.true;
    player.defer(card.action(player));
    runAllActions(game);
    expect(player.energy).eq(0);
    expect(player.megaCredits).eq(2);
  });

  it('preserves Tropical Resort heat conversion, cost and points with the Mars tag', () => {
    const [, player] = testGame(2);
    const card = newProjectCard(CardName.TROPICAL_RESORT_REBALANCED_BETTER_MARS)!;
    expect(card.tags).deep.eq([Tag.BUILDING, Tag.MARS]);
    expect(card.cost).eq(11);
    player.production.heat = 2;
    card.play(player);
    expect(player.production.heat).eq(0);
    expect(player.production.megacredits).eq(3);
    expect(card.getVictoryPoints(player)).eq(2);
  });

  it('gives only the two available full Better Mars reworks priority', () => {
    const cards = new GameCards(both).getProjectCards();
    const university = cards.find((card) => card.name === CardName.MARS_UNIVERSITY_BETTER_MARS)!;
    const meat = cards.find((card) => card.name === CardName.MEAT_INDUSTRY_BETTER_MARS)!;
    expect(university.cost).eq(10);
    expect(meat.cost).eq(2);
    const [, player] = testGame(2);
    const animals = newCard(CardName.BIRDS);
    meat.onResourceAdded?.(player, animals, 2);
    expect(player.megaCredits).eq(2);
    expect(cards.some((card) => card.name === CardName.MARS_UNIVERSITY_REBALANCED || card.name === CardName.MEAT_INDUSTRY_REBALANCED)).is.false;
    const fallback = new GameCards({...both, pathfindersExpansion: false}).getProjectCards();
    const rb = fallback.find((card) => card.name === CardName.MARS_UNIVERSITY_REBALANCED)!;
    expect(rb.cost).eq(reference.cards.find((card) => card.symbol === 'MARS_UNIVERSITY_REBALANCED')!.cost);
    expect(fallback.some((card) => card.name === CardName.MEAT_INDUSTRY_BETTER_MARS)).is.true;
    const onlyRb = new GameCards({...both, betterMarsExpansion: false}).getProjectCards();
    expect(onlyRb.some((card) => card.name === CardName.MEAT_INDUSTRY_REBALANCED)).is.true;
  });

  it('does not let force-included incompatible Better Mars cards displace Rebalanced fallbacks', () => {
    const options = {...both, betterMarsExpansion: false, pathfindersExpansion: false,
      includedCards: [CardName.MARS_UNIVERSITY_BETTER_MARS, CardName.MEAT_INDUSTRY_BETTER_MARS]};
    const names = new GameCards(options).getProjectCards().map((card) => card.name);
    expect(names).includes(CardName.MARS_UNIVERSITY_REBALANCED).and.includes(CardName.MEAT_INDUSTRY_REBALANCED);
    expect(names).not.includes(CardName.MARS_UNIVERSITY_BETTER_MARS).and.not.includes(CardName.MEAT_INDUSTRY_BETTER_MARS);
  });

  it('reloads all five combined IDs and their real effects', () => {
    const [game, player] = testGame(2, both);
    const names = families.map((family) => family[3]);
    names.forEach((name) => player.playedCards.push(newCard(name)));
    const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())), {viewOnly: true});
    expect(restored.players[0].tableau.asArray().map((card) => card.name)).deep.eq(names);
    expect(restored.players[0].tableau.get(CardName.TROPICAL_RESORT_REBALANCED_BETTER_MARS)?.getVictoryPoints(restored.players[0])).eq(2);
  });
});
