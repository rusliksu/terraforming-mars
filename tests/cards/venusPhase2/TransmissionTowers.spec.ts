import {expect} from 'chai';
import {TransmissionTowers} from '../../../src/server/cards/venusPhase2/TransmissionTowers';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {setVenusScaleLevel} from '../../TestingUtils';

describe('TransmissionTowers', () => {
  let card: TransmissionTowers;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new TransmissionTowers();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
    player.playedCards.push(card);
  });

  it('requires Venus 8%', () => {
    expect(card.canPlay(player)).is.false;
    setVenusScaleLevel(game, 8);
    expect(card.canPlay(player)).is.true;
  });

  it('decreases M€ production 1 step on play', () => {
    player.production.override({megacredits: 1});
    card.play(player);
    expect(player.production.megacredits).to.eq(0);
  });

  it('gains 1 energy per Floating Array owned on Venus', () => {
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    const spaces = venusSurface.getAvailableSpacesForLand(player);
    VenusPhase2Expansion.addFloaterArrayTile(player, spaces[0].id);
    VenusPhase2Expansion.addFloaterArrayTile(player, spaces[1].id);

    // Reset any energy granted by space bonuses so only the card's own effect is measured.
    player.energy = 0;
    card.action(player);
    expect(player.energy).to.eq(2);
  });
});
