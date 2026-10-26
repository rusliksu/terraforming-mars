import {expect} from 'chai';
import {GalaxyDefenders} from '../../../src/server/cards/solaris/GalaxyDefenders';
import {testGame} from '../../TestGame';
import {fakeCard} from '../../TestingUtils';
import {Tag} from '../../../src/common/cards/Tag';

describe('GalaxyDefenders', () => {
  it('gains 1 M€ and 1 fighter when another Jovian-tagged card is played', () => {
    const card = new GalaxyDefenders();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);

    player.playCard(fakeCard({tags: [Tag.JOVIAN]}));

    expect(player.megaCredits).eq(1);
    expect(card.resourceCount).eq(1);
  });

  it('gains nothing for a non-Jovian tag', () => {
    const card = new GalaxyDefenders();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);

    player.playCard(fakeCard({tags: [Tag.BUILDING]}));

    expect(player.megaCredits).eq(0);
    expect(card.resourceCount).eq(0);
  });

  it('scales with multiple Jovian tags on the same card', () => {
    const card = new GalaxyDefenders();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(card);

    player.playCard(fakeCard({tags: [Tag.JOVIAN, Tag.JOVIAN]}));

    expect(player.megaCredits).eq(2);
    expect(card.resourceCount).eq(2);
  });

  it('triggers on itself when played, since it also carries a Jovian tag', () => {
    const card = new GalaxyDefenders();
    const [/* game */, player] = testGame(1);

    player.playCard(card);

    expect(player.megaCredits).eq(1);
    expect(card.resourceCount).eq(1);
  });

  it('scores 1 VP per fighter', () => {
    const card = new GalaxyDefenders();
    const [/* game */, player] = testGame(1);

    card.resourceCount = 3;
    expect(card.getVictoryPoints(player)).eq(3);
  });
});
