import {expect} from 'chai';
import {AtmoSequester} from '../../../src/server/cards/venusPhase2/AtmoSequester';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';

describe('AtmoSequester', () => {
  let card: AtmoSequester;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new AtmoSequester();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
  });

  it('cannot act without 4 energy', () => {
    player.energy = 3;
    expect(card.canAct(player)).is.false;
    player.energy = 4;
    expect(card.canAct(player)).is.true;
  });

  it('spends 4 energy to raise Venus 1 step and add a floater to a card', () => {
    const dirigibles = new Dirigibles();
    player.playedCards.push(dirigibles);
    player.energy = 4;
    const venusBefore = game.getVenusScaleLevel();

    card.action(player);
    runAllActions(game);

    expect(player.energy).to.eq(0);
    expect(game.getVenusScaleLevel()).to.eq(venusBefore + 2);
    expect(dirigibles.resourceCount).to.eq(1);
  });
});
