import {expect} from 'chai';
import {Horses} from '../../../src/server/cards/sillyfication/Horses';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions, setOxygenLevel} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('Horses', () => {
  let card: Horses;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Horses();
    [game, player, player2] = testGame(2);
    player.playedCards.push(card);
    player.production.override({plants: 1});
  });

  it('requires 10% oxygen', () => {
    setOxygenLevel(game, 9);
    expect(card.canPlay(player)).is.false;
    setOxygenLevel(game, 10);
    expect(card.canPlay(player)).is.true;
  });

  it('play drops your plant production and attacks a plant producer', () => {
    setOxygenLevel(game, 10);
    player2.production.override({plants: 3});

    card.play(player);
    runAllActions(game);

    expect(player.production.plants).to.eq(0);
    // Only player2 can lose plant production, so the attack auto-resolves onto them.
    expect(player2.production.plants).to.eq(2);
  });

  it('action adds 3 animals; scores 1 VP per 2 animals', () => {
    card.action(player);
    runAllActions(game);
    expect(card.resourceCount).to.eq(3);
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
