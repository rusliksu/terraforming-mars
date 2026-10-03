import {expect} from 'chai';
import {QuantumResearch} from '../../../src/server/cards/delta/QuantumResearch';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {CardType} from '../../../src/common/cards/CardType';

describe('QuantumResearch', () => {
  let card: QuantumResearch;
  let player: TestPlayer;

  beforeEach(() => {
    card = new QuantumResearch();
    [/* game */, player] = testGame(2);
  });

  it('requires 3 science tags', () => {
    player.tagsForTest = {science: 2};
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {science: 3};
    expect(card.canPlay(player)).is.true;
  });

  it('reduces the cost to buy a card by 1 M€', () => {
    const before = player.cardCost;
    card.play(player);
    expect(player.cardCost).eq(before - 1);
  });

  it('scores 1 VP', () => {
    expect(card.getVictoryPoints(player)).eq(1);
  });

  it('is a blue (Active) card', () => {
    expect(card.type).eq(CardType.ACTIVE);
  });
});
