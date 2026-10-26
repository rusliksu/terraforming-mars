import {expect} from 'chai';
import {OrbitDumping} from '../../../src/server/cards/sillyfication/OrbitDumping';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('OrbitDumping', () => {
  let card: OrbitDumping;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new OrbitDumping();
    [game, player, player2] = testGame(2);
  });

  it('all players lose 3 M€ production; you gain 3 titanium; -2 VP', () => {
    player.production.override({megacredits: 5});
    player2.production.override({megacredits: 5});
    player.titanium = 0;

    card.play(player);
    runAllActions(game);

    expect(player.production.megacredits).to.eq(2);
    expect(player2.production.megacredits).to.eq(2);
    expect(player.titanium).to.eq(3);
    expect(card.getVictoryPoints(player)).to.eq(-2);
  });
});
