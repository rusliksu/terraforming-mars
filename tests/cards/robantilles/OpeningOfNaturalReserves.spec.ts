import {expect} from 'chai';
import {OpeningOfNaturalReserves} from '../../../src/server/cards/robantilles/OpeningOfNaturalReserves';
import {Fish} from '../../../src/server/cards/base/Fish';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('OpeningOfNaturalReserves', () => {
  let card: OpeningOfNaturalReserves;
  let player: TestPlayer;

  beforeEach(() => {
    card = new OpeningOfNaturalReserves();
    [, player] = testGame(1);
  });

  it('scores 0 VP with no Animal cards', () => {
    expect(card.getVictoryPoints(player)).eq(0);
  });

  it('scores 1 VP per 4 Animals on other Animal cards, not itself', () => {
    const fish = new Fish();
    fish.resourceCount = 9;
    player.playedCards.push(fish);
    player.playedCards.push(card);

    expect(card.getVictoryPoints(player)).eq(2);
  });
});
