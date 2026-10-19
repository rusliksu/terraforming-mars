import {expect} from 'chai';
import {GreatOceanLaboratory} from '../../../src/server/cards/corporatebetterments/GreatOceanLaboratory';
import {Fish} from '../../../src/server/cards/base/Fish';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {maxOutOceans, runAllActions} from '../../TestingUtils';

describe('GreatOceanLaboratory', () => {
  let card: GreatOceanLaboratory;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new GreatOceanLaboratory();
    [game, player] = testGame(1);
  });

  it('cannot play without 5 oceans', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 5 oceans', () => {
    maxOutOceans(player, 5);
    expect(card.canPlay(player)).is.true;
  });

  it('gains M€ production for microbe tags played, including itself', () => {
    player.playedCards.push(card);
    // Playing the card itself carries a Microbe tag.
    card.onCardPlayed(player, card);
    runAllActions(game);
    expect(player.production.megacredits).to.eq(1);

    const fish = new Fish();
    player.playedCards.push(fish);
    card.onCardPlayed(player, fish);
    runAllActions(game);
    // Fish has no Microbe tag, so no additional production.
    expect(player.production.megacredits).to.eq(1);
  });

  it('scores 1 VP per Microbe tag owned', () => {
    // Push the card into the tableau first: victory-point tag counting adds this card's own
    // tag(s) only when it *isn't* already part of the player's tableau.
    player.playedCards.push(card);
    player.tagsForTest = {microbe: 3};
    expect(card.getVictoryPoints(player)).to.eq(3);
  });
});
