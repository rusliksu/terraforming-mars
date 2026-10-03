import {expect} from 'chai';
import {ModularQuarters} from '../../../src/server/cards/venusPhase2/ModularQuarters';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';

describe('ModularQuarters', () => {
  let card: ModularQuarters;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ModularQuarters();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
  });

  it('raises Venus 1 step on play', () => {
    const venusBefore = game.getVenusScaleLevel();
    card.play(player);
    expect(game.getVenusScaleLevel()).to.eq(venusBefore + 2);
  });

  it('adds 2 floaters to an eligible card whenever a Venus Habitat is placed', () => {
    const dirigibles = new Dirigibles();
    player.playedCards.push(card, dirigibles);

    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    const space = venusSurface.getAvailableSpacesForLand(player)[0];
    VenusPhase2Expansion.addCloudCityTile(player, space.id);
    runAllActions(game);

    expect(dirigibles.resourceCount).to.eq(2);
  });

  it('does not react to non-Venus-Habitat tiles placed on Venus', () => {
    const dirigibles = new Dirigibles();
    player.playedCards.push(card, dirigibles);

    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    const space = venusSurface.getAvailableSpacesForLand(player)[0];
    VenusPhase2Expansion.addFloaterArrayTile(player, space.id);
    runAllActions(game);

    expect(dirigibles.resourceCount).to.eq(0);
  });
});
