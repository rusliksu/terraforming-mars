import {expect} from 'chai';
import {Banker} from '../../src/server/awards/Banker';
import {IAward} from '../../src/server/awards/IAward';
import {IGame} from '../../src/server/IGame';
import {Mayor} from '../../src/server/milestones/Mayor';
import {Resource} from '../../src/common/Resource';
import {TestPlayer} from '../TestPlayer';
import {testGame} from '../TestGame';
import {Server} from '../../src/server/models/ServerModel';
import {GlobalParameter} from '../../src/common/GlobalParameter';
import {Phase} from '../../src/common/Phase';
import {MicroMills} from '../../src/server/cards/base/MicroMills';
import {EarthCatapult} from '../../src/server/cards/base/EarthCatapult';
import {OrOptions} from '../../src/server/inputs/OrOptions';
import {SelectOption} from '../../src/server/inputs/SelectOption';

describe('ServerModel', () => {
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  function createTestGame(showOtherPlayersVP: boolean, undoStepOption = false) {
    [game, player, player2] = testGame(2, {showOtherPlayersVP, undoStepOption});
    // Claim milestone
    const milestone = new Mayor();

    game.claimedMilestones.push({
      player: player,
      milestone: milestone,
    });

    // Fund awards
    const award: IAward = new Banker();
    game.fundAward(player, award);

    // Set second player to win Banker award
    player2.production.add(Resource.MEGACREDITS, 10);

    // Our testing player will be 2nd Banker in the game
    player.production.add(Resource.MEGACREDITS, 7);
  }

  it('Should always return current player\'s VP', () => {
    createTestGame(false);
    const response = Server.getPlayerModel(player);
    expect(response.thisPlayer.victoryPointsBreakdown.total).eq(25);
    expect(response.thisPlayer.victoryPointsBreakdown.milestones).eq(5);
    expect(response.players[0].victoryPointsBreakdown.total).eq(25);
    expect(response.players[1].victoryPointsBreakdown.total).eq(0);
  });

  it('Should return all players\' VP', () => {
    createTestGame(true);
    const response = Server.getPlayerModel(player);
    expect(response.thisPlayer.victoryPointsBreakdown.total).eq(25);
    expect(response.players[0].victoryPointsBreakdown.total).eq(25);
    expect(response.players[0].victoryPointsBreakdown.milestones).eq(5);
    expect(response.players[1].victoryPointsBreakdown.total).eq(25);
    expect(response.players[1].victoryPointsBreakdown.awards).eq(5);
  });

  it('Should hide all players\' VP when spectator', () => {
    createTestGame(false);
    const response = Server.getSpectatorModel(game);
    expect(response.players[0].victoryPointsBreakdown.total).eq(0);
    expect(response.players[1].victoryPointsBreakdown.total).eq(0);
  });

  it('Should hide player hands from spectator when private hands are enabled', () => {
    createTestGame(false);
    player.cardsInHand.push(new MicroMills());

    const response = Server.getSpectatorModel(game);

    expect(response.players[0].spectatorCards).eq(undefined);
  });

  it('Should hide player hands from spectator when private hands are disabled', () => {
    [game, player, player2] = testGame(2, {privateHands: false});
    player.cardsInHand.push(new MicroMills());
    player.draftedCards.push(new EarthCatapult());
    player.dealtProjectCards.push(new EarthCatapult());
    player2.cardsInHand.push(new EarthCatapult());

    const response = Server.getSpectatorModel(game);

    expect(response.players[0].spectatorCards).eq(undefined);
    expect(response.players[1].spectatorCards).eq(undefined);
  });

  it('Should hide player hands from spectator at game end', () => {
    [game, player, player2] = testGame(2);
    player.cardsInHand.push(new MicroMills());
    player2.cardsInHand.push(new EarthCatapult());
    game.phase = Phase.END;

    const response = Server.getSpectatorModel(game);

    expect(response.players[0].spectatorCards).eq(undefined);
    expect(response.players[1].spectatorCards).eq(undefined);
  });

  it('Should include globalParameterSteps at game end', () => {
    createTestGame(false);
    // Simulate players contributing to global parameters
    player.globalParameterSteps[GlobalParameter.TEMPERATURE] = 5;
    player.globalParameterSteps[GlobalParameter.OXYGEN] = 3;
    player.globalParameterSteps[GlobalParameter.OCEANS] = 2;

    player2.globalParameterSteps[GlobalParameter.TEMPERATURE] = 2;
    player2.globalParameterSteps[GlobalParameter.OXYGEN] = 6;

    game.phase = Phase.END;

    const response = Server.getPlayerModel(player);

    // Current player should always see their globalParameterSteps
    expect(response.thisPlayer.globalParameterSteps[GlobalParameter.TEMPERATURE]).eq(5);
    expect(response.thisPlayer.globalParameterSteps[GlobalParameter.OXYGEN]).eq(3);
    expect(response.thisPlayer.globalParameterSteps[GlobalParameter.OCEANS]).eq(2);

    // Other players' globalParameterSteps should be visible at game end
    const otherPlayer = response.players.find((p) => p.id === player2.id);
    expect(otherPlayer).is.not.undefined;
    expect(otherPlayer!.globalParameterSteps[GlobalParameter.TEMPERATURE]).eq(2);
    expect(otherPlayer!.globalParameterSteps[GlobalParameter.OXYGEN]).eq(6);
  });

  it('Should not include globalParameterSteps during game', () => {
    createTestGame(false);
    player.globalParameterSteps[GlobalParameter.TEMPERATURE] = 5;
    player2.globalParameterSteps[GlobalParameter.OXYGEN] = 3;

    game.phase = Phase.ACTION;

    const response = Server.getPlayerModel(player);

    // Current player should see their own steps
    expect(response.thisPlayer.globalParameterSteps[GlobalParameter.TEMPERATURE]).eq(5);

    // Other players' steps should be empty during game (player id is undefined during game)
    const otherPlayer = response.players.find((p) => p.color === player2.color && p.name === player2.name);
    expect(otherPlayer).is.not.undefined;
    expect(Object.keys(otherPlayer!.globalParameterSteps).length).eq(0);
  });

  it('Should include globalParameterSteps when showOtherPlayersVP is true', () => {
    createTestGame(true);
    player.globalParameterSteps[GlobalParameter.TEMPERATURE] = 4;
    player2.globalParameterSteps[GlobalParameter.OXYGEN] = 7;

    game.phase = Phase.ACTION;

    const response = Server.getPlayerModel(player);

    // With showOtherPlayersVP, all players' steps should be visible
    expect(response.thisPlayer.globalParameterSteps[GlobalParameter.TEMPERATURE]).eq(4);

    const otherPlayer = response.players.find((p) => p.color === player2.color && p.name === player2.name);
    expect(otherPlayer).is.not.undefined;
    expect(otherPlayer!.globalParameterSteps[GlobalParameter.OXYGEN]).eq(7);
  });

  it('Should expose game inputSeq for shadow correlation', () => {
    createTestGame(false);
    game.shadowInputSeq = 12;

    const response = Server.getPlayerModel(player);

    expect(response.game.inputSeq).eq(12);
  });

  it('exposes stable PlayerInput annotations to machine-controlled clients', () => {
    [game, player] = testGame(1);
    const waitingFor = new OrOptions(
      new SelectOption('Surrender this game and start a bot'),
      new SelectOption('Continue playing'),
    ).annotate('surrender-confirmation');

    const response = Server.getWaitingFor(player, waitingFor);

    expect(response).not.to.be.undefined;
    expect(response!.annotation).eq('surrender-confirmation');
  });

  it('exposes annotations on nested machine-controlled options', () => {
    [game, player] = testGame(1);
    const waitingFor = new OrOptions(
      new SelectOption('Surrender').annotate('surrender-action'),
      new SelectOption('Continue'),
    );

    const response = Server.getWaitingFor(player, waitingFor);

    expect(response).not.to.be.undefined;
    expect(response!.type).eq('or');
    expect(response!.options[0].annotation).eq('surrender-action');
    expect(response!.options[1].annotation).eq(undefined);
  });

  it('exposes step-back capability only to the journal actor', () => {
    createTestGame(false, true);
    game.actionReplayState = {
      rootSnapshot: game.serialize(),
      entries: [{
        actorId: player.id,
        promptFingerprint: 'prompt:root',
        input: {type: 'option'},
      }],
      currentActorId: player.id,
      currentPromptFingerprint: 'prompt:current',
      resetBeforeNextInput: false,
    };

    expect(Server.getPlayerModel(player).canStepBack).is.true;
    expect(Server.getPlayerModel(player2).canStepBack).is.false;
  });
});
