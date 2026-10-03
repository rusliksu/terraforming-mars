import {expect} from 'chai';
import {GenerousRedistribution} from '../../../src/server/cards/sillyfication/GenerousRedistribution';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('GenerousRedistribution', () => {
  let card: GenerousRedistribution;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new GenerousRedistribution();
    [/* game */, player, player2] = testGame(2, {preludeExtension: true});
  });

  it('gives every player 3 TR / 2 plants / 1 card, and you get double', () => {
    const trBefore = player.terraformRating;
    const tr2Before = player2.terraformRating;
    player.cardsInHand = [];
    player2.cardsInHand = [];

    card.play(player);

    expect(player.terraformRating).to.eq(trBefore + 6);
    expect(player.plants).to.eq(4);
    expect(player.cardsInHand).has.lengthOf(2);

    expect(player2.terraformRating).to.eq(tr2Before + 3);
    expect(player2.plants).to.eq(2);
    expect(player2.cardsInHand).has.lengthOf(1);
  });
});
