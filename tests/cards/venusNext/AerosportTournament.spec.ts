import {expect} from 'chai';
import {addCity} from '../../TestingUtils';
import {AerosportTournament} from '../../../src/server/cards/venusNext/AerosportTournament';
import {Celestic} from '../../../src/server/cards/venusNext/Celestic';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';

describe('AerosportTournament', () => {
  let player: TestPlayer;
  let card: AerosportTournament;

  beforeEach(() => {
    [/* game */, player] = testGame(2);
    card = new AerosportTournament();
  });

  it('Can play', () => {
    const corp = new Celestic();
    const [/* game */, player] = testGame(2);
    player.playedCards.push(corp);
    corp.resourceCount = 4;
    expect(card.canPlay(player)).is.not.true;
    corp.resourceCount = 5;
    expect(card.canPlay(player)).is.true;
  });
  it('Play', () => {
    addCity(player, '03');
    cast(card.play(player), undefined);

    expect(player.megaCredits).to.eq(1);

    player.megaCredits = 0;
    addCity(player, '05');
    cast(card.play(player), undefined);
    expect(player.megaCredits).to.eq(2);
  });

  it('counts a Cloud City tile on the separate Venus surface board too', () => {
    const [game, player] = testGame(2, {venusPhase2Expansion: true});
    addCity(player, '03');
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    const [space] = venusSurface.getAvailableSpacesForLand(player);
    VenusPhase2Expansion.addCloudCityTile(player, space.id);

    cast(card.play(player), undefined);
    expect(player.megaCredits).to.eq(2); // 1 Mars city + 1 Venus Cloud City.
  });
});
