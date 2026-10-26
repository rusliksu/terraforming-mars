import {expect} from 'chai';
import {SurveyorsTeam} from '../../../src/server/cards/venusPhase2/SurveyorsTeam';
import {Tag} from '../../../src/common/cards/Tag';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {fakeCard} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';

describe('SurveyorsTeam', () => {
  let card: SurveyorsTeam;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SurveyorsTeam();
    [game, player] = testGame(2);
  });

  it('keeps the revealed card when it has a Planetary tag', () => {
    const planetCard = fakeCard({tags: [Tag.MARS]});
    game.projectDeck.drawPile.push(planetCard);

    card.action(player);

    expect(player.cardsInHand).to.include(planetCard);
    expect(game.projectDeck.discardPile).to.not.include(planetCard);
  });

  it('discards the revealed card when it has no Planetary tag', () => {
    const otherCard = fakeCard({tags: [Tag.SCIENCE]});
    game.projectDeck.drawPile.push(otherCard);

    card.action(player);

    expect(player.cardsInHand).to.not.include(otherCard);
    expect(game.projectDeck.discardPile).to.include(otherCard);
  });
});
