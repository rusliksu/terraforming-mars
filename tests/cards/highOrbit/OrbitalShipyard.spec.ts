import {expect} from 'chai';
import {OrbitalShipyard} from '../../../src/server/cards/highOrbit/OrbitalShipyard';
import {Tag} from '../../../src/common/cards/Tag';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {fakeCard, runAllActions} from '../../TestingUtils';

describe('OrbitalShipyard', () => {
  let card: OrbitalShipyard;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new OrbitalShipyard();
    [game, player] = testGame(2);
  });

  it('gains 2 M€ for its own Infrastructure tag when played', () => {
    player.playedCards.push(card);
    card.onCardPlayed(player, card);
    runAllActions(game);
    expect(player.megaCredits).to.eq(2);
  });

  it('gains 2 M€ whenever a card with the Infrastructure tag is played', () => {
    player.playedCards.push(card);
    card.onCardPlayed(player, fakeCard({tags: [Tag.INFRASTRUCTURE]}));
    runAllActions(game);
    expect(player.megaCredits).to.eq(2);
  });

  it('does not gain M€ for a card without the Infrastructure tag', () => {
    player.playedCards.push(card);
    card.onCardPlayed(player, fakeCard({tags: [Tag.SPACE]}));
    runAllActions(game);
    expect(player.megaCredits).to.eq(0);
  });
});
