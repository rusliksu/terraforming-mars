import {expect} from 'chai';
import {OrbitalHeadquarters} from '../../../src/server/cards/highOrbit/OrbitalHeadquarters';
import {Teractor} from '../../../src/server/cards/corporation/Teractor';
import {Tag} from '../../../src/common/cards/Tag';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions, fakeCard} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('OrbitalHeadquarters', () => {
  let card: OrbitalHeadquarters;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new OrbitalHeadquarters();
    [game, player] = testGame(2);
  });

  it('gains 10 M€ on play', () => {
    cast(card.play(player), undefined);
    runAllActions(game);
    expect(player.megaCredits).to.eq(10);
  });

  it('does nothing when no corporation is picked', () => {
    player.playedCards.push(card);
    card.onCardPlayed(player, fakeCard({tags: [Tag.BUILDING]}));
    runAllActions(game);
    expect(player.megaCredits).to.eq(0);
  });

  it('gains 1 M€ when a played tag matches a corporation tag', () => {
    player.playedCards.push(card);
    player.pickedCorporationCard = new Teractor();

    card.onCardPlayed(player, fakeCard({tags: [Tag.EARTH]}));
    runAllActions(game);
    expect(player.megaCredits).to.eq(1);

    card.onCardPlayed(player, fakeCard({tags: [Tag.BUILDING]}));
    runAllActions(game);
    expect(player.megaCredits).to.eq(1);
  });
});
