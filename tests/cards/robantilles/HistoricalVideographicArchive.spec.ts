import {expect} from 'chai';
import {HistoricalVideographicArchive} from '../../../src/server/cards/robantilles/HistoricalVideographicArchive';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {fakeCard} from '../../TestingUtils';
import {CardType} from '../../../src/common/cards/CardType';

describe('HistoricalVideographicArchive', () => {
  let card: HistoricalVideographicArchive;
  let player: TestPlayer;

  beforeEach(() => {
    card = new HistoricalVideographicArchive();
    [/* game */, player] = testGame(1);
  });

  it('scores 0 VP with no event cards played', () => {
    expect(card.getVictoryPoints(player)).to.eq(0);
  });

  it('scores 1 VP for every 3 event cards played, rounded down', () => {
    for (let i = 0; i < 2; i++) {
      player.playedCards.push(fakeCard({type: CardType.EVENT}));
    }
    expect(card.getVictoryPoints(player)).to.eq(0);

    player.playedCards.push(fakeCard({type: CardType.EVENT}));
    expect(card.getVictoryPoints(player)).to.eq(1);

    for (let i = 0; i < 2; i++) {
      player.playedCards.push(fakeCard({type: CardType.EVENT}));
    }
    expect(card.getVictoryPoints(player)).to.eq(1);

    player.playedCards.push(fakeCard({type: CardType.EVENT}));
    expect(card.getVictoryPoints(player)).to.eq(2);
  });

  it('does not count non-event cards', () => {
    for (let i = 0; i < 3; i++) {
      player.playedCards.push(fakeCard({type: CardType.AUTOMATED}));
    }
    expect(card.getVictoryPoints(player)).to.eq(0);
  });
});
