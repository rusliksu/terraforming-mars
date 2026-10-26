import {expect} from 'chai';
import {SalvageDepot} from '../../../src/server/cards/highOrbit/SalvageDepot';
import {Tag} from '../../../src/common/cards/Tag';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {fakeCard, runAllActions} from '../../TestingUtils';

describe('SalvageDepot', () => {
  let card: SalvageDepot;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new SalvageDepot();
    [game, player] = testGame(2);
  });

  it('cannot play without more Space tags than Infrastructure tags', () => {
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {[Tag.SPACE]: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act without energy or a discard pile', () => {
    player.energy = 0;
    game.projectDeck.discardPile = [];
    expect(card.canAct(player)).is.false;

    player.energy = 1;
    game.projectDeck.discardPile = [];
    expect(card.canAct(player)).is.false;

    player.energy = 0;
    game.projectDeck.discardPile = [fakeCard()];
    expect(card.canAct(player)).is.false;
  });

  it('spends 1 energy to shuffle the discard pile and draw 1 card from it', () => {
    const discarded1 = fakeCard();
    const discarded2 = fakeCard();
    game.projectDeck.discardPile = [discarded1, discarded2];
    player.energy = 1;
    player.cardsInHand = [];

    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);

    expect(player.energy).to.eq(0);
    expect(player.cardsInHand).has.lengthOf(1);
    expect(game.projectDeck.discardPile).has.lengthOf(1);
  });
});
