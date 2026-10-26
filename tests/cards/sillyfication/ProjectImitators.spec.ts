import {expect} from 'chai';
import {ProjectImitators} from '../../../src/server/cards/sillyfication/ProjectImitators';
import {Sponsors} from '../../../src/server/cards/base/Sponsors';
import {IGame} from '../../../src/server/IGame';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';
import {testGame} from '../../TestGame';

describe('ProjectImitators', () => {
  let card: ProjectImitators;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new ProjectImitators();
    [game, player, player2] = testGame(2);
  });

  it('cannot be played without an opponent automated card', () => {
    expect(card.canPlay(player)).is.false;
    player2.playedCards.push(new Sponsors());
    expect(card.canPlay(player)).is.true;
  });

  it('copies the chosen card into hand and discounts it 5 M€ this generation', () => {
    player2.playedCards.push(new Sponsors());

    const selectCard = cast(card.play(player), SelectCard);
    selectCard.cb([selectCard.cards[0]]);

    const copy = player.cardsInHand.find((c) => c.name === 'Sponsors');
    expect(copy).is.not.undefined;
    expect(card.getCardDiscount(player, copy!)).to.eq(5);
    // Only the copied card, and only this generation.
    game.generation = game.generation + 1;
    expect(card.getCardDiscount(player, copy!)).to.eq(0);
  });
});
