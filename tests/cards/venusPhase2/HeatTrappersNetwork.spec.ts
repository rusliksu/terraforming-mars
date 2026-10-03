import {expect} from 'chai';
import {HeatTrappersNetwork} from '../../../src/server/cards/venusPhase2/HeatTrappersNetwork';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {runAllActions} from '../../TestingUtils';

describe('HeatTrappersNetwork', () => {
  let card: HeatTrappersNetwork;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new HeatTrappersNetwork();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
    player.playedCards.push(card);
  });

  it('decreases energy production 1 step on play', () => {
    player.production.override({energy: 1});
    card.play(player);
    expect(player.production.energy).to.eq(0);
  });

  it('cannot act without 2 heat', () => {
    player.heat = 1;
    expect(card.canAct(player)).is.false;
    player.heat = 2;
    expect(card.canAct(player)).is.true;
  });

  it('spends 2 heat to gain 1 M€ per Gas Mine owned on Venus', () => {
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    const spaces = venusSurface.getAvailableSpacesForGaslight(player);
    VenusPhase2Expansion.addGasMineTile(player, spaces[0].id);
    VenusPhase2Expansion.addGasMineTile(player, spaces[1].id);
    player.heat = 2;

    card.action(player);
    runAllActions(game);
    expect(player.heat).to.eq(0);
    expect(player.megaCredits).to.eq(2);
  });
});
