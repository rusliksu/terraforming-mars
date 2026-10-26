import {expect} from 'chai';
import {Probe} from '../../../src/server/cards/highOrbit/Probe';
import {Tag} from '../../../src/common/cards/Tag';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {fakeCard, runAllActions} from '../../TestingUtils';

describe('Probe', () => {
  let card: Probe;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Probe();
    [game, player] = testGame(2);
  });

  it('cannot play without more Space tags than Infrastructure tags', () => {
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {[Tag.SPACE]: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act without M€', () => {
    player.megaCredits = 0;
    expect(card.canAct(player)).is.not.true;
    player.megaCredits = 1;
    expect(card.canAct(player)).is.true;
  });

  it('cannot act when the deck is empty', () => {
    player.megaCredits = 1;
    game.projectDeck.drawPile.length = 0;
    expect(card.canAct(player)).is.false;
  });

  it('action fails, no science tag', () => {
    player.megaCredits = 1;
    game.projectDeck.drawPile.push(fakeCard());

    card.action(player);
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(card.resourceCount).to.eq(0);
  });

  it('action succeeds with a science tag, and discards the revealed card either way', () => {
    player.megaCredits = 1;
    const revealed = fakeCard({tags: [Tag.SCIENCE]});
    game.projectDeck.drawPile.push(revealed);

    card.action(player);
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(card.resourceCount).to.eq(1);
    expect(game.projectDeck.discardPile).deep.eq([revealed]);
  });

  it('awards 1 VP per data resource', () => {
    card.resourceCount = 0;
    expect(card.getVictoryPoints(player)).to.eq(0);
    card.resourceCount = 3;
    expect(card.getVictoryPoints(player)).to.eq(3);
  });
});
