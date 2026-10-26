import {expect} from 'chai';
import {VenusAircraftHaven} from '../../../src/server/cards/venusPhase2/VenusAircraftHaven';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions, setVenusScaleLevel} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast} from '../../../src/common/utils/utils';

describe('VenusAircraftHaven', () => {
  let card: VenusAircraftHaven;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new VenusAircraftHaven();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
    player.playedCards.push(card);
  });

  it('requires Venus 6%', () => {
    expect(card.canPlay(player)).is.false;
    setVenusScaleLevel(game, 6);
    expect(card.canPlay(player)).is.true;
  });

  it('adds 2 floaters to this card on play', () => {
    setVenusScaleLevel(game, 6);
    card.play(player);
    runAllActions(game);
    expect(card.resourceCount).to.eq(2);
    expect(card.getVictoryPoints(player)).to.eq(0);
  });

  it('can add 1 floater to this card via its action', () => {
    card.action(player);
    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    options.options[0].cb();
    runAllActions(game);
    expect(card.resourceCount).to.eq(1);
  });

  it('can remove 3 floaters from this card to raise Venus 1 step', () => {
    card.resourceCount = 3;
    const venusBefore = game.getVenusScaleLevel();

    card.action(player);
    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    options.options[1].cb();
    runAllActions(game);

    expect(card.resourceCount).to.eq(0);
    expect(game.getVenusScaleLevel()).to.eq(venusBefore + 2);
  });
});
