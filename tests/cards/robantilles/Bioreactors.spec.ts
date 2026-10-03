import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {fakeCard} from '../../TestingUtils';
import {Bioreactors} from '../../../src/server/cards/robantilles/Bioreactors';
import {CardResource} from '../../../src/common/CardResource';
import {TestPlayer} from '../../TestPlayer';

describe('Bioreactors', () => {
  let card: Bioreactors;
  let player: TestPlayer;

  beforeEach(() => {
    card = new Bioreactors();
    [, player] = testGame(2);
  });

  it('cannot play without 2 Science tags', () => {
    expect(card.canPlay(player)).is.false;

    player.tagsForTest = {science: 2};
    expect(card.canPlay(player)).is.true;
  });

  it('adds an additional microbe every time a microbe is added to any card', () => {
    player.playedCards.push(card);
    const microbeCard = fakeCard({resourceType: CardResource.MICROBE});
    microbeCard.resourceCount = 0;
    player.playedCards.push(microbeCard);

    player.addResourceTo(microbeCard, {qty: 1, log: false});

    expect(microbeCard.resourceCount).to.eq(2);
  });

  it('does not double non-microbe resources', () => {
    player.playedCards.push(card);
    const animalCard = fakeCard({resourceType: CardResource.ANIMAL});
    animalCard.resourceCount = 0;
    player.playedCards.push(animalCard);

    player.addResourceTo(animalCard, {qty: 1, log: false});

    expect(animalCard.resourceCount).to.eq(1);
  });

  it('scores 1 flat victory point', () => {
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
