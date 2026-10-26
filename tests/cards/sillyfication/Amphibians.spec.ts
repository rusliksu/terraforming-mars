import {expect} from 'chai';
import {Amphibians} from '../../../src/server/cards/sillyfication/Amphibians';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('Amphibians', () => {
  let card: Amphibians;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new Amphibians();
    [/* game */, player, player2] = testGame(2);
    player.playedCards.push(card);
  });

  it('requires -12 C or warmer', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('gains an animal only when the owner places an ocean tile', () => {
    const game = player.game;
    const space = game.board.getAvailableSpacesForOcean(player)[0];
    game.addOcean(player, space);
    expect(card.resourceCount).to.eq(1);
  });

  it('does not react to other players placing oceans', () => {
    const game = player.game;
    const space = game.board.getAvailableSpacesForOcean(player2)[0];
    game.addOcean(player2, space);
    expect(card.resourceCount).to.eq(0);
  });
});
