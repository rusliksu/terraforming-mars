import {expect} from 'chai';
import {cast} from '@/common/utils/utils';
import {IngegneriSpaziali} from '../../../src/server/cards/corporatebetterments/IngegneriSpaziali';
import {Tag} from '../../../src/common/cards/Tag';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {fakeCard, runAllActions} from '../../TestingUtils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {IProjectCard} from '../../../src/server/cards/IProjectCard';

describe('IngegneriSpaziali', () => {
  let card: IngegneriSpaziali;
  let player: TestPlayer;
  let player2: TestPlayer;
  let player3: TestPlayer;
  let player4: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new IngegneriSpaziali();
    [game, player, player2, player3, player4] = testGame(4);
  });

  it('takes Space cards into hand, lets each opponent take one of the rest in turn, discards the remainder', () => {
    const spaceCards = [
      fakeCard({tags: [Tag.SPACE]}),
      fakeCard({tags: [Tag.SPACE]}),
      fakeCard({tags: [Tag.SPACE]}),
    ];
    const otherCards = [
      fakeCard(), fakeCard(), fakeCard(), fakeCard(), fakeCard(), fakeCard(), fakeCard(),
    ];
    // Deck.draw() pops from the end of drawPile, so the last-pushed card is revealed first.
    game.projectDeck.drawPile.push(...otherCards, ...spaceCards);

    const startingHandSize = player.cardsInHand.length;
    card.play(player);

    expect(player.cardsInHand.length).to.eq(startingHandSize + spaceCards.length);
    for (const spaceCard of spaceCards) {
      expect(player.cardsInHand).to.include(spaceCard);
    }

    runAllActions(game);
    const input2 = cast(player2.popWaitingFor(), SelectCard<IProjectCard>);
    expect(input2.cards.length).to.eq(7);
    input2.cb([otherCards[0]]);
    runAllActions(game);

    const input3 = cast(player3.popWaitingFor(), SelectCard<IProjectCard>);
    expect(input3.cards.length).to.eq(6);
    input3.cb([otherCards[1]]);
    runAllActions(game);

    const input4 = cast(player4.popWaitingFor(), SelectCard<IProjectCard>);
    expect(input4.cards.length).to.eq(5);
    input4.cb([otherCards[2]]);
    runAllActions(game);

    expect(player2.cardsInHand).to.include(otherCards[0]);
    expect(player3.cardsInHand).to.include(otherCards[1]);
    expect(player4.cardsInHand).to.include(otherCards[2]);
    expect(game.projectDeck.discardPile).to.include.members(otherCards.slice(3));
  });

  it('scores 1 flat victory point', () => {
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
