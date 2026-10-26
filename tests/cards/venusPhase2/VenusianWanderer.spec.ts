import {expect} from 'chai';
import {VenusianWanderer} from '../../../src/server/cards/venusPhase2/VenusianWanderer';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions, setVenusScaleLevel} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {cast} from '../../../src/common/utils/utils';

describe('VenusianWanderer', () => {
  let card: VenusianWanderer;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new VenusianWanderer();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
    player.playedCards.push(card);
  });

  it('requires Venus 4%', () => {
    expect(card.canPlay(player)).is.false;
    setVenusScaleLevel(game, 4);
    expect(card.canPlay(player)).is.true;
  });

  it('adds a floater to any card whenever a Venus tag is played, including itself', () => {
    const dirigibles = new Dirigibles();
    player.playedCards.push(dirigibles);

    card.onCardPlayed(player, dirigibles);
    runAllActions(game);

    // Both this card and Dirigibles collect floaters, so the player is asked which to fill.
    const selectCard = cast(player.popWaitingFor(), SelectCard);
    selectCard.cb([dirigibles]);

    expect(dirigibles.resourceCount).to.eq(1);
    expect(card.getVictoryPoints(player)).to.eq(0);
  });
});
