import {expect} from 'chai';
import {Resource} from '@/common/Resource';
import {Server} from '@/server/models/ServerModel';
import {TradeWithEnergy} from '@/server/player/Colonies';
import {Ceres} from '@/server/colonies/Ceres';
import {Luna} from '@/server/colonies/Luna';
import {Huan} from '@/server/cards/ceos/Huan';
import {DarksideSmugglersUnion} from '@/server/cards/moon/DarksideSmugglersUnion';
import {CardName} from '@/common/cards/CardName';
import {Naomi} from '@/server/cards/ceos/Naomi';
import {OrOptions} from '@/server/inputs/OrOptions';
import {testGame} from '@tests/TestGame';
import {runAllActions} from '@tests/TestingUtils';
import {cast} from '@/common/utils/utils';

describe('Own-player colony trade context', () => {
  function setup() {
    const [game, player, opponent] = testGame(3, {coloniesExtension: true, ceoExtension: true});
    while (game.deferredActions.pop() !== undefined) { /* Clear colony setup. */ }
    const ceres = new Ceres();
    ceres.trackPosition = 3;
    const luna = new Luna();
    luna.trackPosition = 2;
    luna.colonies.push(opponent.id);
    luna.visitor = opponent.id;
    game.colonies = [ceres, luna];
    return {game, player, opponent, ceres, luna};
  }

  it('exposes actual discounted stock fees only to their owner without spending them', () => {
    const {game, player, opponent, ceres} = setup();
    player.energy = 3;
    player.titanium = 2;
    player.megaCredits = 9;
    player.colonies.tradeDiscount = 1;
    player.colonies.tradeOffset = 1;
    const before = player.stock.asUnits();
    const model = Server.getPlayerModel(player);
    const context = model.thisPlayer.colonyTradeContext;
    expect(context).not.eq(undefined);
    expect(context?.payments).deep.eq([
      {resource: Resource.ENERGY, amount: 2, available: true},
      {resource: Resource.TITANIUM, amount: 2, available: true},
      {resource: Resource.MEGACREDITS, amount: 8, available: true},
    ]);
    expect(context?.remainingActionsThisTurn).eq(2);
    expect(context?.tradeOffset).eq(1);
    expect(context?.stockColonies.find((colony) => colony.name === ceres.name)?.tradeAmounts)
      .deep.eq([1, 2, 3, 4, 6, 8, 10]);
    expect(model.players.find((row) => row.color === opponent.color)?.colonyTradeContext).eq(undefined);
    expect(Server.getSpectatorModel(game).players.every((row) => row.colonyTradeContext === undefined)).eq(true);
    expect(player.stock.asUnits()).deep.eq(before);

    new TradeWithEnergy(player).trade(ceres);
    runAllActions(game);
    expect(player.energy).eq(1);
    expect(player.steel).eq(6);
  });

  it('does not carry remaining energy into the next generation', () => {
    const {game, player, ceres} = setup();
    player.energy = 6;
    new TradeWithEnergy(player).trade(ceres);
    runAllActions(game);
    expect(player.energy).eq(3);
    player.runProductionPhase();
    expect(player.energy).eq(0);
    expect(player.heat).eq(3);
  });

  it('reports the real one-action limit and an exhausted trade fleet', () => {
    const {player} = setup();
    player.availableActionsThisRound = 1;
    player.megaCredits = 9;
    player.colonies.usedTradeFleets = 1;
    const context = Server.getPlayerModel(player).thisPlayer.colonyTradeContext;
    expect(context?.remainingActionsThisTurn).eq(1);
    expect(context?.tradeAvailable).eq(false);
  });

  it('keeps a used special payment mechanism outside the future stock projection', () => {
    const {player} = setup();
    player.playedCards.push(new DarksideSmugglersUnion());
    player.actionsThisGeneration.add(CardName.DARKSIDE_SMUGGLERS_UNION);
    expect(Server.getPlayerModel(player).thisPlayer.colonyTradeContext?.additionalPaymentMechanism).eq(true);
    const {player: heatPlayer} = setup();
    heatPlayer.canUseHeatAsMegaCredits = true;
    expect(Server.getPlayerModel(heatPlayer).thisPlayer.colonyTradeContext?.additionalPaymentMechanism).eq(true);
  });

  it('reports known next-generation Huan restrictions from the game state', () => {
    const {player, opponent} = setup();
    const huan = new Huan();
    opponent.playedCards.push(huan);
    huan.action(opponent);
    expect(Server.getPlayerModel(player).thisPlayer.colonyTradeContext?.nextGenerationTradeAccess).eq('blocked');
    expect(Server.getPlayerModel(opponent).thisPlayer.colonyTradeContext?.nextGenerationTradeAccess).eq('normal');
  });

  it('preserves activation tracks and earlier choices across deferred Naomi prompts', () => {
    const {game, player, ceres, luna} = setup();
    const card = new Naomi();
    card.action(player);
    const first = cast(game.deferredActions.pop()!.execute(), OrOptions);
    const firstModel = first.toModel(player);
    expect(firstModel.colonyTrackChoices).deep.eq({version: 1, currentColony: ceres.name, colonies: [
      {name: ceres.name, originalTrackPosition: 3, choice: 'pending'},
      {name: luna.name, originalTrackPosition: 2, choice: 'pending'},
    ]});
    first.options[0].cb();
    const second = cast(game.deferredActions.pop()!.execute(), OrOptions);
    expect(second.toModel(player).colonyTrackChoices?.currentColony).eq(luna.name);
    expect(second.toModel(player).colonyTrackChoices?.colonies[0]).deep.eq({
      name: ceres.name, originalTrackPosition: 3, choice: 'high',
    });
    expect(firstModel.colonyTrackChoices?.colonies[0].choice).eq('pending');
    expect(ceres.trackPosition).eq(6);
    expect(luna.trackPosition).eq(2);
  });
});
