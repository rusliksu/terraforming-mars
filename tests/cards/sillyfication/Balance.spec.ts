import {expect} from 'chai';
import {Balance} from '../../../src/server/cards/sillyfication/Balance';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast} from '../../../src/common/utils/utils';

describe('Balance', () => {
  let card: Balance;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new Balance();
    [/* game */, player, player2] = testGame(2, {preludeExtension: true});
  });

  it('draws players up to 10 cards short, and makes players over 10 discard down to 10, and raises TR', () => {
    const game = player.game;
    const tr = player.terraformRating;
    player.cardsInHand = [];
    for (let i = 0; i < 4; i++) {
      player.cardsInHand.push({name: `short-${i}`} as any);
    }
    player2.cardsInHand = [];
    for (let i = 0; i < 13; i++) {
      player2.cardsInHand.push({name: `over-${i}`} as any);
    }

    card.play(player);
    expect(player.cardsInHand).has.lengthOf(10);
    expect(player.terraformRating).to.eq(tr + 1);

    runAllActions(game);
    const discard = cast(player2.popWaitingFor(), SelectCard);
    expect(discard.config.min).to.eq(3);
    discard.cb(player2.cardsInHand.slice(0, 3));
    runAllActions(game);

    expect(player2.cardsInHand).has.lengthOf(10);
  });
});
