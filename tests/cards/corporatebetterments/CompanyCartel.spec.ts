import {expect} from 'chai';
import {cast} from '../../../src/common/utils/utils';
import {CompanyCartel} from '../../../src/server/cards/corporatebetterments/CompanyCartel';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {fakeCard, runAllActions} from '../../TestingUtils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {IProjectCard} from '../../../src/server/cards/IProjectCard';

describe('CompanyCartel', () => {
  let card: CompanyCartel;
  let player: TestPlayer;
  let player2: TestPlayer;
  let player3: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new CompanyCartel();
    [game, player, player2, player3] = testGame(3);
  });

  it('draws 2x player count, the player keeps 2, then each other player takes one in turn, discarding the rest', () => {
    const revealed = [0, 1, 2, 3, 4, 5].map(() => fakeCard());
    // Deck.draw() pops from the end of drawPile, so the last-pushed card is revealed first.
    game.projectDeck.drawPile.push(...revealed.slice().reverse());

    const startingHandSize = player.cardsInHand.length;
    const selectKeep = cast(card.play(player), SelectCard<IProjectCard>);
    expect(selectKeep.cards).has.length(6);

    selectKeep.cb([revealed[0], revealed[1]]);
    runAllActions(game);

    expect(player.cardsInHand.length).eq(startingHandSize + 2);
    expect(player.cardsInHand).includes(revealed[0]);
    expect(player.cardsInHand).includes(revealed[1]);

    const input2 = cast(player2.popWaitingFor(), SelectCard<IProjectCard>);
    expect(input2.cards).has.length(4);
    input2.cb([revealed[2]]);
    runAllActions(game);

    const input3 = cast(player3.popWaitingFor(), SelectCard<IProjectCard>);
    expect(input3.cards).has.length(3);
    input3.cb([revealed[3]]);
    runAllActions(game);

    expect(player2.cardsInHand).includes(revealed[2]);
    expect(player3.cardsInHand).includes(revealed[3]);
    expect(game.projectDeck.discardPile).to.include.members([revealed[4], revealed[5]]);
  });

  it('cannot play if the deck cannot supply twice the player count', () => {
    game.projectDeck.drawPile.splice(0, game.projectDeck.drawPile.length);
    game.projectDeck.discardPile.splice(0, game.projectDeck.discardPile.length);
    expect(card.canPlay(player)).is.false;
  });
});
