import {expect} from 'chai';
import {Tardigrades} from '../../../src/server/cards/base/Tardigrades';
import {IProjectCard} from '../../../src/server/cards/IProjectCard';
import {HousePrinting} from '../../../src/server/cards/prelude/HousePrinting';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {UnexpectedApplication} from '../../../src/server/cards/prelude2/UnexpectedApplication';
import {cast} from '../../../src/common/utils/utils';

describe('UnexpectedApplication', () => {
  let card: UnexpectedApplication;
  let game: IGame;
  let player: TestPlayer;
  let tardigrades: IProjectCard;
  let housePrinting: IProjectCard;

  beforeEach(() => {
    card = new UnexpectedApplication();
    [game, player] = testGame(2);
    player.cardsInHand.push(card);
    tardigrades = new Tardigrades();
    housePrinting = new HousePrinting();
  });

  it('can not play', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('Should play', () => {
    player.cardsInHand.push(housePrinting, tardigrades);
    expect(card.canPlay(player)).is.true;

    player.playCard(card);
    const selectCard = cast(game.deferredActions.pop()!.execute(), SelectCard<IProjectCard>);

    expect(selectCard.cards).to.not.include(card);

    selectCard.cb([housePrinting]);
    runAllActions(game); // Draw cards
    expect(player.cardsInHand).does.not.contain(housePrinting);
    expect(game.projectDeck.discardPile).contains(housePrinting);
  });

  it('asks which card to discard even with one discard candidate', () => {
    player.cardsInHand.push(tardigrades);
    expect(card.canPlay(player)).is.true;

    player.playCard(card);
    const selectCard = cast(game.deferredActions.pop()!.execute(), SelectCard<IProjectCard>);

    expect(selectCard.cards).deep.eq([tardigrades]);
    expect(selectCard.config.min).eq(1);
    expect(selectCard.config.max).eq(1);
    expect(player.cardsInHand).contains(tardigrades);
    expect(game.projectDeck.discardPile).does.not.contain(tardigrades);

    selectCard.cb([tardigrades]);
    runAllActions(game);

    expect(player.cardsInHand).does.not.contain(tardigrades);
    expect(game.projectDeck.discardPile).contains(tardigrades);
  });

  it('Does not expect itself to be the discarded card', () => {
    player.cardsInHand.push(card);

    expect(card.canPlay(player)).is.false;

    player.cardsInHand.push(tardigrades);

    expect(card.canPlay(player)).is.true;

    player.playCard(card);
    const selectCard = cast(game.deferredActions.pop()!.execute(), SelectCard<IProjectCard>);

    expect(selectCard.cards).to.not.include(card);

    selectCard.cb([tardigrades]);

    runAllActions(game);

    expect(player.cardsInHand).does.not.contain(tardigrades);
    expect(game.projectDeck.discardPile).contains(tardigrades);
  });
});
