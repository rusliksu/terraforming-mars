import {expect} from 'chai';
import {StarwindIITradeship} from '../../../src/server/cards/venusPhase2/StarwindIITradeship';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';

describe('StarwindIITradeship', () => {
  let card: StarwindIITradeship;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new StarwindIITradeship();
    [game, player] = testGame(2, {coloniesExtension: true});
    player.playedCards.push(card);
  });

  it('gains 1 trade fleet on play', () => {
    const fleetSizeBefore = player.colonies.getFleetSize();
    card.play(player);
    expect(player.colonies.getFleetSize()).to.eq(fleetSizeBefore + 1);
  });

  it('cannot act without 3 heat', () => {
    player.heat = 2;
    expect(card.canAct(player)).is.false;
    player.heat = 3;
    expect(card.canAct(player)).is.true;
  });

  it('spends 3 heat to start a colony trade', () => {
    player.heat = 3;
    player.megaCredits = 20;

    card.action(player);
    runAllActions(game);

    expect(player.heat).to.eq(0);
    expect(player.popWaitingFor()).to.not.be.undefined;
  });
});
