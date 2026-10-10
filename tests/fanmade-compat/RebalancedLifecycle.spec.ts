import {expect} from 'chai';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {BoardName} from '@/common/boards/BoardName';
import {CardName} from '@/common/cards/CardName';
import {DEFAULT_EXPANSIONS, Expansion} from '@/common/cards/GameModule';
import {NewGameConfig} from '@/common/game/NewGameConfig';
import {SimpleGameModel} from '@/common/models/SimpleGameModel';
import {Phase} from '@/common/Phase';
import {Game} from '@/server/Game';
import {GameCards} from '@/server/GameCards';
import {DEFAULT_GAME_OPTIONS, GameOptions} from '@/server/game/GameOptions';
import {SerializedGame} from '@/server/SerializedGame';
import {Server} from '@/server/models/ServerModel';
import {newProjectCard} from '@/server/createCard';
import {isIActionCard} from '@/server/cards/ICard';
import {REBALANCED_CARD_MANIFEST} from '@/server/cards/rebalanced/RebalancedCardManifest';
import {ApiCreateGame} from '@/server/routes/ApiCreateGame';
import {MockRequest, MockResponse} from '../routes/HttpMocks';
import {RouteTestScaffolding} from '../routes/RouteTestScaffolding';
import {testGame} from '../TestGame';
import {finishGeneration, runAllActions} from '../TestingUtils';

function setup(): NewGameConfig {
  return {
    ...DEFAULT_GAME_OPTIONS,
    players: [{name: 'Lifecycle player', color: 'blue', beginner: false, handicap: 0, first: true, isBot: false}],
    expansions: {...DEFAULT_EXPANSIONS, corpera: true, prelude: true, prelude2: true,
      turmoil: true, pathfinders: true, rebalanced: true, betterMars: true},
    board: BoardName.THARSIS,
    seed: 0.123456789,
    randomFirstPlayer: false,
    clonedGamedId: undefined,
    escapeVelocity: undefined,
    initialDraft: false,
    botGame: false,
    startingCorporations: 1,
    startingPreludes: 3,
    customCorporationsList: [CardName.PRISTAR, CardName.PRISTAR_REBALANCED_BETTER_MARS],
    customPreludes: [CardName.EARLY_SETTLEMENT, CardName.EARLY_SETTLEMENT_REBALANCED_BETTER_MARS,
      CardName.SELF_SUFFICIENT_SETTLEMENT, CardName.SELF_SUFFICIENT_SETTLEMENT_REBALANCED_BETTER_MARS,
      CardName.APPLIED_SCIENCE],
  };
}

describe('Rebalanced lifecycle', () => {
  it('builds actual rendering metadata for all 113 replacements and five combinations', () => {
    const manifest = REBALANCED_CARD_MANIFEST;
    const specs = [...Object.values(manifest.projectCards), ...Object.values(manifest.corporationCards),
      ...Object.values(manifest.preludeCards), ...Object.values(manifest.standardProjects)];
    expect(specs).length(118);
    for (const spec of specs) {
      const card = new spec.Factory();
      expect(card.metadata.renderData, card.name).not.eq(undefined);
    }
  });

  it('creates an actual API game from old original/combined pairs and keeps Prelude 2 through reload', async () => {
    const request = new MockRequest();
    const response = new MockResponse();
    const scaffolding = new RouteTestScaffolding(request);
    const post = scaffolding.post(new ApiCreateGame([{limit: 99, perMs: 1}]), response);
    request.emitString(JSON.stringify(setup()));
    request.emitter.emit('end');
    await post;
    expect(response.statusCode).eq(200);
    const model: SimpleGameModel = JSON.parse(response.content);
    expect(model.gameOptions.expansions.rebalanced).is.true;
    expect(model.gameOptions.expansions.prelude2).is.true;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    if (game === undefined) {
      throw new Error('The API did not retain its created game');
    }
    const player = game.players[0];
    expect(player.dealtCorporationCards.map((card) => card.name)).deep.eq([CardName.PRISTAR_REBALANCED_BETTER_MARS]);
    expect(player.dealtPreludeCards.map((card) => card.name).sort()).deep.eq([
      CardName.EARLY_SETTLEMENT_REBALANCED_BETTER_MARS,
      CardName.SELF_SUFFICIENT_SETTLEMENT_REBALANCED_BETTER_MARS,
      CardName.APPLIED_SCIENCE,
    ].sort());
    const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())), {viewOnly: true});
    expect(restored.gameOptions.rebalancedExpansion).is.true;
    expect(restored.gameOptions.prelude2Expansion).is.true;
    expect(restored.players[0].dealtPreludeCards.map((card) => card.name)).deep.eq(player.dealtPreludeCards.map((card) => card.name));
    expect(restored.players[0].dealtCorporationCards.map((card) => card.name)).deep.eq(player.dealtCorporationCards.map((card) => card.name));
  });

  const railsFamily = [CardName.MARTIAN_RAILS, CardName.MARTIAN_RAILS_BETTER_MARS,
    CardName.MARTIAN_RAILS_REBALANCED, CardName.MARTIAN_RAILS_REBALANCED_BETTER_MARS];
  for (const [rebalancedExpansion, betterMarsExpansion, expected] of [
    [false, false, 0], [false, true, 1], [true, false, 2], [true, true, 3],
  ] as const) {
    it('preserves the selected module mode after save/reload ' + rebalancedExpansion + '/' + betterMarsExpansion, () => {
      const [game] = testGame(2, {rebalancedExpansion, betterMarsExpansion,
        preludeExtension: true, prelude2Expansion: true, pathfindersExpansion: true});
      const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())), {viewOnly: true});
      const options = Server.getGameModel(restored).gameOptions;
      expect(options.expansions.rebalanced).eq(rebalancedExpansion);
      expect(options.expansions.betterMars).eq(betterMarsExpansion);
      expect(options.expansions.prelude2).is.true;
      expect(restored.projectDeck.serialize()).deep.eq(game.projectDeck.serialize());
      const names = new GameCards(restored.gameOptions).getProjectCards().map((card) => card.name);
      expect(names.filter((name) => railsFamily.includes(name))).deep.eq([railsFamily[expected]]);
    });
  }

  it('retains a new card action, production, resources and VP across a generation and reload', () => {
    const [game, player] = testGame(2, {rebalancedExpansion: true});
    game.phase = Phase.ACTION;
    game.generation = 2;
    player.titanium = 2;
    const card = newProjectCard(CardName.ASTEROID_HOLLOWING_REBALANCED);
    if (card === undefined || !isIActionCard(card)) {
      throw new Error('Missing registered Hollowing action');
    }
    player.playCard(card);
    runAllActions(game);
    player.defer(card.action(player));
    runAllActions(game);
    const mc = player.megaCredits;
    finishGeneration(game);
    expect(player.megaCredits - mc).eq(player.terraformRating + 1);
    const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())), {viewOnly: true});
    const restoredPlayer = restored.players[0];
    const restoredCard = restoredPlayer.playedCards.get(CardName.ASTEROID_HOLLOWING_REBALANCED);
    if (restoredCard === undefined || !isIActionCard(restoredCard)) {
      throw new Error('Reload lost the Hollowing action');
    }
    expect(restoredCard.resourceCount).eq(1);
    expect(restoredCard.getVictoryPoints(restoredPlayer)).eq(1);
    expect(restoredPlayer.production.megacredits).eq(1);
    expect(restoredCard.canAct(restoredPlayer)).is.true;
    restoredPlayer.defer(restoredCard.action(restoredPlayer));
    runAllActions(restored);
    expect(restoredPlayer.titanium).eq(0);
    expect(restoredPlayer.production.megacredits).eq(2);
    expect(restoredCard.resourceCount).eq(2);
    expect(restoredCard.getVictoryPoints(restoredPlayer)).eq(2);
  });

  it('loads the synthetic pre-port save with Rebalanced disabled and its original decks intact', () => {
    const saved: SerializedGame = JSON.parse(readFileSync(join(__dirname, 'fixtures/pre-port-action.json'), 'utf8'));
    expect(saved.gameOptions).not.have.property('rebalancedExpansion');
    expect(saved.gameOptions.expansions).not.have.property('rebalanced');
    const restored = Game.deserialize(saved, {simulation: true});
    expect(restored.gameOptions.rebalancedExpansion).is.false;
    expect(Server.getGameModel(restored).gameOptions.expansions.rebalanced).is.false;
    expect(restored.projectDeck.serialize()).deep.eq(saved.projectDeck);
    expect(restored.players[0].megaCredits).eq(43);
    expect(restored.players[0].getWaitingFor()).not.eq(undefined);
  });

  it('keeps an original played card price and VP when both new save fields are absent', () => {
    const [game, player] = testGame(2);
    const original = newProjectCard(CardName.MARS_UNIVERSITY);
    if (original === undefined) {
      throw new Error('Missing original University');
    }
    player.playedCards.push(original);
    const saved: SerializedGame = JSON.parse(JSON.stringify(game.serialize()));
    const legacyOptions: Partial<GameOptions> = saved.gameOptions;
    const legacyExpansions: Partial<Record<Expansion, boolean>> = saved.gameOptions.expansions;
    delete legacyOptions.rebalancedExpansion;
    delete legacyExpansions.rebalanced;
    const restored = Game.deserialize(saved, {viewOnly: true});
    expect(restored.gameOptions.rebalancedExpansion).is.false;
    const restoredCard = restored.players[0].playedCards.get(CardName.MARS_UNIVERSITY);
    expect(restoredCard?.cost).eq(8);
    expect(restoredCard?.getVictoryPoints(restored.players[0])).eq(1);
    expect(restored.players[0].playedCards.get(CardName.MARS_UNIVERSITY_REBALANCED)).eq(undefined);
  });
});
