import {expect} from 'chai';
import {PreludeGambit} from '../../../src/server/cards/sillyfication/PreludeGambit';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {IPreludeCard} from '../../../src/server/cards/prelude/IPreludeCard';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';
import {runAllActions} from '../../TestingUtils';

describe('PreludeGambit', () => {
  let card: PreludeGambit;
  let player: TestPlayer;

  beforeEach(() => {
    card = new PreludeGambit();
    [/* game */, player] = testGame(2, {preludeExtension: true});
  });

  it('gains 1 TR, discards 10 cards, and draws 6 preludes, letting you play up to 2', () => {
    const game = player.game;
    player.cardsInHand = [];
    for (let i = 0; i < 15; i++) {
      player.cardsInHand.push({name: `filler-${i}`} as any);
    }
    const trBefore = player.terraformRating;

    card.play(player);
    runAllActions(game);

    expect(player.terraformRating).to.eq(trBefore + 1);

    const discard = cast(player.popWaitingFor(), SelectCard);
    discard.cb(discard.cards.slice(0, 10));
    runAllActions(game);

    const firstPick = cast(player.popWaitingFor(), SelectCard<IPreludeCard>);
    expect(firstPick.cards).has.lengthOf(6);
    const [firstPrelude] = firstPick.cards;
    firstPick.cb([firstPrelude]);
    runAllActions(game);

    expect(player.playedCards.asArray().some((c) => c.name === firstPrelude.name)).is.true;

    const secondPick = cast(player.popWaitingFor(), SelectCard<IPreludeCard>);
    expect(secondPick.cards).has.lengthOf(5);
    secondPick.cb([]);
    runAllActions(game);

    expect(player.popWaitingFor()).is.undefined;
  });
});
