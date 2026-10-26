import {expect} from 'chai';
import {ShowAndTell} from '../../../src/server/cards/sillyfication/ShowAndTell';
import {Ants} from '../../../src/server/cards/base/Ants';
import {Birds} from '../../../src/server/cards/base/Birds';
import {Comet} from '../../../src/server/cards/base/Comet';
import {IGame} from '../../../src/server/IGame';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('ShowAndTell', () => {
  let card: ShowAndTell;
  let player: TestPlayer;
  let player2: TestPlayer;
  let player3: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new ShowAndTell();
    [game, player, player2, player3] = testGame(3);
    player.cardsInHand = [];
    player2.cardsInHand = [new Ants()];
    player3.cardsInHand = [new Birds(), new Comet(), new Comet()];
  });

  it('cannot be played when no opponent holds a card', () => {
    player2.cardsInHand = [];
    player3.cardsInHand = [];
    expect(card.canPlay(player)).is.false;
  });

  it('each opponent reveals up to 2 cards and the active player takes 2 of them', () => {
    card.play(player);
    runAllActions(game);

    // player2 only holds 1 card, so they reveal just that one.
    const p2reveal = cast(player2.popWaitingFor(), SelectCard);
    expect(p2reveal.config.min).to.eq(1);
    expect(p2reveal.config.max).to.eq(1);
    p2reveal.cb([player2.cardsInHand[0]]);
    runAllActions(game);

    // player3 holds 3 cards, so they reveal 2 of them.
    const p3reveal = cast(player3.popWaitingFor(), SelectCard);
    expect(p3reveal.config.min).to.eq(2);
    expect(p3reveal.config.max).to.eq(2);
    const birds = player3.cardsInHand.find((c) => c.name === 'Birds')!;
    const comet = player3.cardsInHand.find((c) => c.name === 'Comet')!;
    p3reveal.cb([birds, comet]);
    runAllActions(game);

    const take = cast(player.popWaitingFor(), SelectCard);
    expect(take.cards.map((c) => c.name).sort()).to.deep.eq(['Ants', 'Birds', 'Comet']);
    expect(take.config.min).to.eq(2);
    expect(take.config.max).to.eq(2);
    take.cb([birds, player2.cardsInHand[0]]);
    runAllActions(game);

    expect(player.cardsInHand.map((c) => c.name).sort()).to.deep.eq(['Ants', 'Birds']);
    // The revealed card that wasn't taken is returned to its owner.
    expect(player3.cardsInHand.map((c) => c.name).sort()).to.deep.eq(['Comet', 'Comet']);
    expect(player2.cardsInHand).to.have.length(0);
  });
});
