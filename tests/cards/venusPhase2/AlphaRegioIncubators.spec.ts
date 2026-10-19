import {expect} from 'chai';
import {AlphaRegioIncubators} from '../../../src/server/cards/venusPhase2/AlphaRegioIncubators';
import {Research} from '../../../src/server/cards/base/Research';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {cast} from '../../../src/common/utils/utils';

describe('AlphaRegioIncubators', () => {
  let card: AlphaRegioIncubators;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new AlphaRegioIncubators();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
  });

  it('gains 1 microbe per Venus tag played, including itself', () => {
    player.playedCards.push(card);

    card.onCardPlayed(player, card);
    expect(card.resourceCount).to.eq(1);

    card.onCardPlayed(player, new Research());
    expect(card.resourceCount).to.eq(1);

    expect(card.getVictoryPoints(player)).to.eq(0);
  });

  it('raises Venus and places a Floating Array on play', () => {
    const venusBefore = game.getVenusScaleLevel();
    card.play(player);
    runAllActions(game);
    expect(game.getVenusScaleLevel()).to.eq(venusBefore + 2);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const target = selectSpace.spaces[0];
    selectSpace.cb(target);
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    expect(venusSurface.getSpaceOrThrow(target.id).tile?.tileType).to.eq(TileType.VENUS_FLOATER_ARRAY);
  });
});
