import {expect} from 'chai';
import {RotatingHands} from '../../../src/server/cards/sillyfication/RotatingHands';
import {Ants} from '../../../src/server/cards/base/Ants';
import {Birds} from '../../../src/server/cards/base/Birds';
import {IGame} from '../../../src/server/IGame';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('RotatingHands', () => {
  let card: RotatingHands;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new RotatingHands();
    [game, player, player2] = testGame(2);
    player.cardsInHand = [new Ants()];
    player2.cardsInHand = [new Birds()];
  });

  it('needs at least 2 players', () => {
    const [/* g */, solo] = testGame(1);
    expect(card.canPlay(solo)).is.false;
    expect(card.canPlay(player)).is.true;
  });

  it('passes each chosen card to the next player', () => {
    card.play(player);
    runAllActions(game);

    cast(player.popWaitingFor(), SelectCard).cb([player.cardsInHand[0]]);
    runAllActions(game);
    cast(player2.popWaitingFor(), SelectCard).cb([player2.cardsInHand[0]]);
    runAllActions(game);

    // With 2 players, "next player" wraps around: they swap hands.
    expect(player.cardsInHand.map((c) => c.name)).to.deep.eq(['Birds']);
    expect(player2.cardsInHand.map((c) => c.name)).to.deep.eq(['Ants']);
  });

  it('skips players with an empty hand', () => {
    player2.cardsInHand = [];
    card.play(player);
    runAllActions(game);

    cast(player.popWaitingFor(), SelectCard).cb([player.cardsInHand[0]]);
    runAllActions(game);

    expect(player2.popWaitingFor()).is.undefined;
    expect(player.cardsInHand).is.empty;
    expect(player2.cardsInHand.map((c) => c.name)).to.deep.eq(['Ants']);
  });
});
