import {expect} from 'chai';
import {ShieldingDrones} from '../../../src/server/cards/solaris/ShieldingDrones';
import {testGame} from '../../TestGame';
import {fakeCard} from '../../TestingUtils';
import {Tag} from '../../../src/common/cards/Tag';

describe('ShieldingDrones', () => {
  it('adds 1 fighter when a Space-tagged card is played', () => {
    const card = new ShieldingDrones();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);

    player.playCard(fakeCard({tags: [Tag.SPACE]}));

    expect(card.resourceCount).eq(1);
  });

  it('adds 1 fighter when a Building-tagged card is played', () => {
    const card = new ShieldingDrones();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);

    player.playCard(fakeCard({tags: [Tag.BUILDING]}));

    expect(card.resourceCount).eq(1);
  });

  it('adds 1 fighter when a Science-tagged card is played', () => {
    const card = new ShieldingDrones();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);

    player.playCard(fakeCard({tags: [Tag.SCIENCE]}));

    expect(card.resourceCount).eq(1);
  });

  it('adds nothing for an unrelated tag', () => {
    const card = new ShieldingDrones();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);

    player.playCard(fakeCard({tags: [Tag.EARTH]}));

    expect(card.resourceCount).eq(0);
  });

  it('stacks when a card has multiple matching tags', () => {
    const card = new ShieldingDrones();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);

    player.playCard(fakeCard({tags: [Tag.SPACE, Tag.BUILDING]}));

    expect(card.resourceCount).eq(2);
  });

  it('triggers on itself when played', () => {
    const card = new ShieldingDrones();
    const [/* game */, player] = testGame(1);

    player.playCard(card);

    expect(card.resourceCount).eq(1);
  });

  it('scores 1 VP per 5 fighters', () => {
    const card = new ShieldingDrones();
    const [/* game */, player] = testGame(1);

    card.resourceCount = 10;
    expect(card.getVictoryPoints(player)).eq(2);
  });
});
