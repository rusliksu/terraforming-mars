import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {AdministrativeDelay} from '../../../src/server/cards/idesofmars/AdministrativeDelay';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';

describe('AdministrativeDelay', () => {
  let card: AdministrativeDelay;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new AdministrativeDelay();
    [game, player] = testGame(2);
  });

  function hasEndTurnOption(): boolean {
    return player.getActions().options.some((option) => option.title === 'End Turn');
  }

  it('does not normally allow ending a turn with 0 actions taken', () => {
    expect(player.actionsTakenThisRound).to.eq(0);
    expect(hasEndTurnOption()).is.false;
  });

  it('allows ending a turn with 0 actions taken, the generation it is played', () => {
    card.play(player);
    expect(player.administrativeDelayActiveGeneration).to.eq(game.generation);
    expect(player.actionsTakenThisRound).to.eq(0);
    expect(hasEndTurnOption()).is.true;
  });

  it('no longer applies in a later generation', () => {
    card.play(player);
    game.generation += 1;
    expect(hasEndTurnOption()).is.false;
  });
});
