import {expect} from 'chai';
import {MusicalChairs} from '../../../src/server/cards/sillyfication/MusicalChairs';
import {SistemasSeebeck} from '../../../src/server/cards/pathfinders/SistemasSeebeck';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('MusicalChairs', () => {
  let card: MusicalChairs;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new MusicalChairs();
    [game, player] = testGame(3);
    player.playedCards.push(card);
  });

  it('scores 1 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(1);
  });

  it('cannot act without energy', () => {
    player.energy = 0;
    expect(card.canAct(player)).is.false;
    player.energy = 1;
    expect(card.canAct(player)).is.true;
  });

  it('cannot act in a solo game', () => {
    const [/* g */, solo] = testGame(1);
    solo.energy = 5;
    expect(card.canAct(solo)).is.false;
  });

  it('spends 1 energy and hands the first-player marker to a random player', () => {
    player.energy = 2;

    card.action(player);

    expect(player.energy).to.eq(1);
    expect(game.players).to.include(game.first);
    expect(game.playersInGenerationOrder[0]).to.eq(game.first);
  });

  it('can reselect the already-current first player - it is not excluded from the pool', () => {
    player.energy = 1;
    game.overrideFirstPlayer(game.players[0]);
    // Force the random pick to land on index 0, same as the current first player.
    game.rng.nextInt = () => 0;

    card.action(player);

    expect(game.first).to.eq(game.players[0]);
  });

  it('with Sistemas Seebeck, heat covers an energy shortfall', () => {
    player.playedCards.push(new SistemasSeebeck());
    player.energy = 0;
    player.heat = 1;

    expect(card.canAct(player)).is.true;
    card.action(player);

    expect(player.energy).to.eq(0);
    expect(player.heat).to.eq(0);
  });
});
