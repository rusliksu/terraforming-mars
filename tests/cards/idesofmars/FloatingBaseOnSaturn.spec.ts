import {expect} from 'chai';
import {FloatingBaseOnSaturn} from '../../../src/server/cards/idesofmars/FloatingBaseOnSaturn';
import {JupiterFloatingStation} from '../../../src/server/cards/colonies/JupiterFloatingStation';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast} from '../../../src/common/utils/utils';

describe('FloatingBaseOnSaturn', () => {
  let card: FloatingBaseOnSaturn;
  let player: TestPlayer;

  beforeEach(() => {
    card = new FloatingBaseOnSaturn();
    [/* game */, player] = testGame(2);
  });

  it('cannot play without a Jovian card holding floaters', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play once a Jovian card is holding floaters', () => {
    const jupiterCard = new JupiterFloatingStation();
    player.playedCards.push(jupiterCard);
    player.addResourceTo(jupiterCard, 3);
    expect(card.canPlay(player)).is.true;
  });

  it('removes up to 2 floaters from the chosen Jovian card', () => {
    const jupiterCard = new JupiterFloatingStation();
    player.playedCards.push(jupiterCard);
    player.addResourceTo(jupiterCard, 3);

    const selectCard = cast(card.play(player), SelectCard);
    selectCard.cb([jupiterCard]);

    expect(jupiterCard.resourceCount).to.eq(1);
  });

  it('removes only what is available when fewer than 2 floaters remain', () => {
    const jupiterCard = new JupiterFloatingStation();
    player.playedCards.push(jupiterCard);
    player.addResourceTo(jupiterCard, 1);

    const selectCard = cast(card.play(player), SelectCard);
    selectCard.cb([jupiterCard]);

    expect(jupiterCard.resourceCount).to.eq(0);
  });

  it('is worth 4 flat victory points', () => {
    expect(card.getVictoryPoints(player)).to.eq(4);
  });
});
