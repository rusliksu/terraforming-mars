import {expect} from 'chai';
import {EnergyHarvest} from '../../../src/server/cards/sillyfication/EnergyHarvest';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('EnergyHarvest', () => {
  let card: EnergyHarvest;
  let player: TestPlayer;

  beforeEach(() => {
    card = new EnergyHarvest();
    [/* game */, player] = testGame(2);
  });

  it('cannot play when no action has been taken yet', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('cannot play when the last action was not placing a greenery', () => {
    const game = player.game;
    game.addCity(player, game.board.getAvailableSpacesForCity(player)[0]);
    expect(card.canPlay(player)).is.false;
  });

  it('can play when the last action placed a greenery', () => {
    const game = player.game;
    const space = game.board.getAvailableSpacesForGreenery(player)[0];
    game.addGreenery(player, space);
    // The real action loop increments this once the placement action fully resolves.
    player.actionsTakenThisGame++;
    runAllActions(game);
    expect(card.canPlay(player)).is.true;
  });

  it('can no longer play once another action has happened', () => {
    const game = player.game;
    const space = game.board.getAvailableSpacesForGreenery(player)[0];
    game.addGreenery(player, space);
    player.actionsTakenThisGame++;
    runAllActions(game);
    expect(card.canPlay(player)).is.true;

    game.addCity(player, game.board.getAvailableSpacesForCity(player)[0]);
    player.actionsTakenThisGame++;
    expect(card.canPlay(player)).is.false;
  });
});
