import {expect} from 'chai';
import {Mulligens} from '../../../src/server/cards/sillyfication/Mulligens';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast} from '../../../src/common/utils/utils';

describe('Mulligens', () => {
  let card: Mulligens;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new Mulligens();
    [/* game */, player, player2] = testGame(2);
  });

  it('has no tags and is worth 2 VP', () => {
    expect(card.tags).to.deep.eq([]);
    expect(card.getVictoryPoints(player)).to.eq(2);
  });

  it('lets each player discard up to the generation number and draw that many back', () => {
    const game = player.game;
    player.cardsInHand = game.projectDeck.drawN(game, 3);
    player2.cardsInHand = game.projectDeck.drawN(game, 3);
    const player2HandSize = player2.cardsInHand.length;

    card.bespokePlay(player);
    runAllActions(game);

    const selectCard = cast(player.popWaitingFor(), SelectCard);
    expect(selectCard.config.max).to.eq(game.generation);
    selectCard.cb(selectCard.cards.slice(0, 1));
    runAllActions(game);

    const selectCard2 = cast(player2.popWaitingFor(), SelectCard);
    selectCard2.cb([]);
    runAllActions(game);

    expect(player2.cardsInHand.length).to.eq(player2HandSize);
  });
});
