import {expect} from 'chai';
import {IshtarOrbitingAcademy} from '../../../src/server/cards/venusPhase2/IshtarOrbitingAcademy';
import {AdvancedAlloys} from '../../../src/server/cards/base/AdvancedAlloys';
import {Ants} from '../../../src/server/cards/base/Ants';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('IshtarOrbitingAcademy', () => {
  let card: IshtarOrbitingAcademy;
  let player: TestPlayer;

  beforeEach(() => {
    card = new IshtarOrbitingAcademy();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('gains 2 M€ whenever a Science tag is played', () => {
    card.onCardPlayed(player, new AdvancedAlloys());
    expect(player.megaCredits).to.eq(2);
  });

  it('does not react to non-Science tags', () => {
    card.onCardPlayed(player, new Ants());
    expect(player.megaCredits).to.eq(0);
  });
});
