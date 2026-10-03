import {expect} from 'chai';
import {JovianBeltMiningOperations} from '../../../src/server/cards/corporatebetterments/JovianBeltMiningOperations';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('JovianBeltMiningOperations', () => {
  let card: JovianBeltMiningOperations;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new JovianBeltMiningOperations();
    [/* game */, player, player2] = testGame(2);
  });

  it('increases own titanium production 2 steps, and others 1 step', () => {
    card.play(player);
    expect(player.production.titanium).to.eq(2);
    expect(player2.production.titanium).to.eq(1);
  });

  it('scores 2 VP', () => {
    expect(card.getVictoryPoints(player)).eq(2);
  });
});
