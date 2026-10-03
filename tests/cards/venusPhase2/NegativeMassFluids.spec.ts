import {expect} from 'chai';
import {NegativeMassFluids} from '../../../src/server/cards/venusPhase2/NegativeMassFluids';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {FLOATERS_VALUE} from '../../../src/common/constants';

describe('NegativeMassFluids', () => {
  let card: NegativeMassFluids;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new NegativeMassFluids();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
  });

  it('requires owning a Venus Habitat', () => {
    expect(card.canPlay(player)).is.false;
    VenusPhase2Expansion.addCloudCityTile(player, VenusPhase2Expansion.venusPhase2Data(game).venusSurface.getAvailableSpacesForLand(player)[0].id);
    expect(card.canPlay(player)).is.true;
  });

  it('increases the value of floaters spent on Venus standard projects by 1', () => {
    VenusPhase2Expansion.addCloudCityTile(player, VenusPhase2Expansion.venusPhase2Data(game).venusSurface.getAvailableSpacesForLand(player)[0].id);
    expect(player.getFloaterValue()).to.eq(FLOATERS_VALUE);
    card.play(player);
    expect(player.getFloaterValue()).to.eq(FLOATERS_VALUE + 1);
  });
});
