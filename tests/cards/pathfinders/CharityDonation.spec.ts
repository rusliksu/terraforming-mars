import {expect} from 'chai';
import {CharityDonation} from '../../../src/server/cards/pathfinders/CharityDonation';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {AcquiredCompany} from '../../../src/server/cards/base/AcquiredCompany';
import {BeamFromAThoriumAsteroid} from '../../../src/server/cards/base/BeamFromAThoriumAsteroid';
import {CEOsFavoriteProject} from '../../../src/server/cards/base/CEOsFavoriteProject';
import {Decomposers} from '../../../src/server/cards/base/Decomposers';
import {runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast} from '../../../src/common/utils/utils';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {IProjectCard} from '../../../src/server/cards/IProjectCard';

describe('CharityDonation', () => {
  let card: CharityDonation;
  let player1: TestPlayer;
  let player2: TestPlayer;
  let player3: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new CharityDonation();
    [game, player1, player2, player3] = testGame(3);
  });

  const canPlayRuns = [
    {deck: 2, expected: false},
    {deck: 3, expected: false},
    {deck: 4, expected: true},
  ] as const;
  for (const run of canPlayRuns) {
    it('canPlay: ' + JSON.stringify(run), () => {
      game.projectDeck.drawPile.length = run.deck;

      expect(card.canPlay(player1)).eq(run.expected);
    });
  }

  function selectAndConfirm(player: TestPlayer, card: IProjectCard): void {
    player.process({type: 'card', cards: [card.name]});
    runAllActions(game);
    cast(player.getWaitingFor(), OrOptions);
    player.process({type: 'or', index: 0, response: {type: 'option'}});
    runAllActions(game);
  }

  it('play', () => {
    const acquiredCompany = new AcquiredCompany();
    const beamFromAThoriumAsteroid = new BeamFromAThoriumAsteroid();
    const ceosFavoriteProject = new CEOsFavoriteProject();
    const decomposers = new Decomposers();
    game.projectDeck.drawPile.push(decomposers, ceosFavoriteProject, beamFromAThoriumAsteroid, acquiredCompany);

    player1.popWaitingFor();
    player2.popWaitingFor();
    player3.popWaitingFor();

    // Letting player 2 go first to test the wraparound nature of the algorithm.
    card.play(player2);
    runAllActions(game);

    cast(player1.getWaitingFor(), undefined);
    cast(player3.getWaitingFor(), undefined);
    const selectCard2 = cast(player2.getWaitingFor(), SelectCard);

    expect(selectCard2.cards).deep.eq([acquiredCompany, beamFromAThoriumAsteroid, ceosFavoriteProject, decomposers]);

    selectAndConfirm(player2, beamFromAThoriumAsteroid);

    cast(player1.getWaitingFor(), undefined);
    cast(player2.getWaitingFor(), undefined);
    const selectCard3 = cast(player3.getWaitingFor(), SelectCard);

    expect(selectCard3.cards).deep.eq([acquiredCompany, ceosFavoriteProject, decomposers]);

    selectAndConfirm(player3, decomposers);

    cast(player2.getWaitingFor(), undefined);
    cast(player3.getWaitingFor(), undefined);
    const selectCard1 = cast(player1.getWaitingFor(), SelectCard);

    expect(selectCard1.cards).deep.eq([acquiredCompany, ceosFavoriteProject]);

    selectAndConfirm(player1, acquiredCompany);

    cast(player1.getWaitingFor(), undefined);
    cast(player2.getWaitingFor(), undefined);
    cast(player3.getWaitingFor(), undefined);

    expect(player1.cardsInHand).deep.eq([acquiredCompany]);
    expect(player2.cardsInHand).deep.eq([beamFromAThoriumAsteroid]);
    expect(player3.cardsInHand).deep.eq([decomposers]);
    expect(game.projectDeck.discardPile).deep.eq([ceosFavoriteProject]);
  });

  it('lets a player return to the same revealed cards before confirming', () => {
    const acquiredCompany = new AcquiredCompany();
    const beamFromAThoriumAsteroid = new BeamFromAThoriumAsteroid();
    const ceosFavoriteProject = new CEOsFavoriteProject();
    const decomposers = new Decomposers();
    game.projectDeck.drawPile.push(decomposers, ceosFavoriteProject, beamFromAThoriumAsteroid, acquiredCompany);

    player1.popWaitingFor();
    player2.popWaitingFor();
    player3.popWaitingFor();

    card.play(player1);
    runAllActions(game);
    const firstChoice = cast(player1.getWaitingFor(), SelectCard<IProjectCard>);
    player1.process({type: 'card', cards: [acquiredCompany.name]});
    runAllActions(game);

    cast(player1.getWaitingFor(), OrOptions);
    player1.process({type: 'or', index: 1, response: {type: 'option'}});
    runAllActions(game);
    const secondChoice = cast(player1.getWaitingFor(), SelectCard<IProjectCard>);

    expect(secondChoice.cards).deep.eq(firstChoice.cards);
    expect(player1.cardsInHand).is.empty;
  });
});
