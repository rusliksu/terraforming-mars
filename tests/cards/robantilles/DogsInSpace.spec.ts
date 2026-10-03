import {expect} from 'chai';
import {DogsInSpace} from '../../../src/server/cards/robantilles/DogsInSpace';
import {InterstellarColonyShip} from '../../../src/server/cards/base/InterstellarColonyShip';
import {Sponsors} from '../../../src/server/cards/base/Sponsors';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('DogsInSpace', () => {
  let card: DogsInSpace;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new DogsInSpace();
    [game, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('adds an animal when a Space-tagged card is played', () => {
    player.onCardPlayed(new InterstellarColonyShip());
    runAllActions(game);
    expect(card.resourceCount).to.eq(1);
  });

  it('does not add an animal for a non-Space card', () => {
    player.onCardPlayed(new Sponsors());
    runAllActions(game);
    expect(card.resourceCount).to.eq(0);
  });

  it('adds an animal to itself, since it carries the Space tag it triggers on', () => {
    player.onCardPlayed(card);
    runAllActions(game);
    expect(card.resourceCount).to.eq(1);
  });

  it('awards 1 VP for every 2 animals on this card', () => {
    player.addResourceTo(card, 5);
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
