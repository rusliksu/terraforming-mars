import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {PublicRelations} from '../../../src/server/cards/idesofmars/PublicRelations';
import {TestPlayer} from '../../TestPlayer';
import {fakeCard} from '../../TestingUtils';

describe('PublicRelations', () => {
  let card: PublicRelations;
  let player: TestPlayer;

  beforeEach(() => {
    card = new PublicRelations();
    [/* game */, player] = testGame(1);
  });

  it('requires 2 Earth tags', () => {
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {earth: 2};
    expect(card.canPlay(player)).is.true;
  });

  it('decreases M€ production on play', () => {
    const startingProduction = player.production.megacredits;
    card.play(player);
    expect(player.production.megacredits).to.eq(startingProduction - 1);
  });

  it('ignores the player\'s own negative-VP cards for scoring', () => {
    const negativeVpCard = fakeCard({victoryPoints: -3, getVictoryPoints: () => -3});
    player.playedCards.push(negativeVpCard);

    const withoutPublicRelations = player.getVictoryPoints().total;

    player.playedCards.push(card);
    const withPublicRelations = player.getVictoryPoints().total;

    // The -3 VP card no longer counts against the player once Public Relations is in play.
    expect(withPublicRelations).to.eq(withoutPublicRelations + 3);
  });

  it('does not affect other players\' negative-VP cards', () => {
    const [, p1, p2] = testGame(2);
    const negativeVpCard = fakeCard({victoryPoints: -3, getVictoryPoints: () => -3});
    const withoutNegativeCard = p2.getVictoryPoints().total;

    p2.playedCards.push(negativeVpCard);
    p1.playedCards.push(card); // p1 owns Public Relations, not p2.

    expect(p2.getVictoryPoints().total).to.eq(withoutNegativeCard - 3);
  });
});
