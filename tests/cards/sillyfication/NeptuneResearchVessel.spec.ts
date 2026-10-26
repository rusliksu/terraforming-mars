import {expect} from 'chai';
import {NeptuneResearchVessel} from '../../../src/server/cards/sillyfication/NeptuneResearchVessel';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {addOcean, runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';

describe('NeptuneResearchVessel', () => {
  let card: NeptuneResearchVessel;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new NeptuneResearchVessel();
    [game, player, player2] = testGame(2);
    player.playedCards.push(card);
  });

  it('requires 2 science and 2 Jovian tags', () => {
    player.tagsForTest = {science: 1};
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {science: 2, jovian: 2};
    expect(card.canPlay(player)).is.true;
  });

  it('scores 1 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(1);
  });

  it('gains 2 M€ whenever any ocean tile is placed', () => {
    player.megaCredits = 0;

    addOcean(player, '05');
    runAllActions(game);
    expect(player.megaCredits).to.eq(2);

    addOcean(player2, '06');
    runAllActions(game);
    expect(player.megaCredits).to.eq(4);
  });
});
