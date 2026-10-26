import {expect} from 'chai';
import {VenusianResearchCommittee} from '../../../src/server/cards/venusPhase2/VenusianResearchCommittee';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {runAllActions} from '../../TestingUtils';

describe('VenusianResearchCommittee', () => {
  let card: VenusianResearchCommittee;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new VenusianResearchCommittee();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
    player.playedCards.push(card);
  });

  it('raises Venus 1 step and draws 1 card for every 2 Venus tags, including itself', () => {
    const venusBefore = game.getVenusScaleLevel();
    const handSizeBefore = player.cardsInHand.length;
    card.play(player);
    runAllActions(game);
    expect(game.getVenusScaleLevel()).to.eq(venusBefore + 2);
    // Itself has 1 Venus tag, so 1 / 2 = 0 cards drawn.
    expect(player.cardsInHand.length).to.eq(handSizeBefore);
  });

  it('draws a card once 2 Venus tags are in play', () => {
    player.playedCards.push(new Dirigibles());
    const handSizeBefore = player.cardsInHand.length;
    card.play(player);
    runAllActions(game);
    expect(player.cardsInHand.length).to.eq(handSizeBefore + 1);
  });
});
