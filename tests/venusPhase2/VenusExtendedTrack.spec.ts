import {expect} from 'chai';
import {Game} from '@/server/Game';
import {testGame} from '../TestGame';
import {maxOutOceans, setOxygenLevel, setTemperature, setVenusScaleLevel} from '../TestingUtils';
import {GrantVenusAltTrackBonusDeferred} from '@/server/venusNext/GrantVenusAltTrackBonusDeferred';
import {cast} from '@/common/utils/utils';
import {Server} from '@/server/models/ServerModel';
import {DEFAULT_GLOBAL_PARAMETERS} from '@/common/GlobalParameterConfig';

describe('Venus Phase 2 track', () => {
  it('caps a multi-step raise at 30 and grants TR only for the remaining step', () => {
    const [game, player] = testGame(2, {
      venusPhase2Expansion: true,
      globalParameters: {...DEFAULT_GLOBAL_PARAMETERS, venus: {...DEFAULT_GLOBAL_PARAMETERS.venus, max: 60}},
    });
    setVenusScaleLevel(game, 28);
    const tr = player.terraformRating;
    game.increaseVenusScaleLevel(player, 3);
    expect(game.getVenusScaleLevel()).eq(30);
    expect(player.terraformRating).eq(tr + 1);
    game.increaseVenusScaleLevel(player, 1);
    expect(game.getVenusScaleLevel()).eq(30);
    expect(player.terraformRating).eq(tr + 1);
  });

  it('completes mandatory Venus at 30 once Mars is terraformed', () => {
    const [game, player] = testGame(2, {venusPhase2Expansion: true, venusNextExtension: true, requiresVenusTrackCompletion: true});
    setOxygenLevel(game, 14);
    setTemperature(game, 8);
    maxOutOceans(player);
    setVenusScaleLevel(game, 28);
    expect(game.marsIsTerraformed()).is.false;
    game.increaseVenusScaleLevel(player, 1);
    expect(game.marsIsTerraformed()).is.true;
  });

  it('preserves the 30 limit after saving and loading a new game', () => {
    const [game] = testGame(2, {venusPhase2Expansion: true});
    setVenusScaleLevel(game, 28);
    const restored = Game.deserialize(game.serialize(), {simulation: true});
    restored.increaseVenusScaleLevel(restored.players[0], 2);
    expect(restored.getVenusScaleLevel()).eq(30);
    expect(Server.getGameOptionsAsModel(restored.gameOptions).globalParameters?.venus.max).eq(30);
  });

  it('preserves the old 60 limit and progress in an unversioned save', () => {
    const [game] = testGame(2, {venusPhase2Expansion: true});
    const save = game.serialize();
    delete save.gameOptions.venusPhase2Max;
    save.venusScaleLevel = 58;
    const restored = Game.deserialize(save, {simulation: true});
    restored.increaseVenusScaleLevel(restored.players[0], 1);
    expect(restored.getVenusScaleLevel()).eq(60);
    expect(Server.getGameOptionsAsModel(restored.gameOptions).globalParameters?.venus.max).eq(60);
    expect(Game.deserialize(restored.serialize(), {simulation: true}).parameters.venus.max).eq(60);
  });

  it('retains the card bonus at 8 and the extra TR at 16', () => {
    const [game, player] = testGame(2, {venusPhase2Expansion: true});
    setVenusScaleLevel(game, 6);
    const cards = player.cardsInHand.length;
    game.increaseVenusScaleLevel(player, 1);
    expect(player.cardsInHand).has.length(cards + 1);
    setVenusScaleLevel(game, 14);
    const tr = player.terraformRating;
    game.increaseVenusScaleLevel(player, 1);
    expect(player.terraformRating).eq(tr + 2);
  });

  it('grants the alternate-board final reward at 30 only once', () => {
    const [game, player] = testGame(2, {venusPhase2Expansion: true, altVenusBoard: true});
    setVenusScaleLevel(game, 28);
    game.increaseVenusScaleLevel(player, 1);
    expect(cast(game.deferredActions.pop(), GrantVenusAltTrackBonusDeferred).wildResource).is.true;
    game.increaseVenusScaleLevel(player, 1);
    expect(game.getVenusScaleLevel()).eq(30);
    expect(game.deferredActions.pop()).is.undefined;
  });
});
