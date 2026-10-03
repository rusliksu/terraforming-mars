import {expect} from 'chai';
import {AphroditeShuttleBase} from '../../../src/server/cards/venusPhase2/AphroditeShuttleBase';
import {StormCraftIncorporated} from '../../../src/server/cards/colonies/StormCraftIncorporated';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {cast} from '../../../src/common/utils/utils';

describe('AphroditeShuttleBase', () => {
  let card: AphroditeShuttleBase;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new AphroditeShuttleBase();
    [game, player] = testGame(2, {venusPhase2Expansion: true});
  });

  it('raises Venus, adds 3 floaters to a Jovian-tagged card, and places a Floating Array tile', () => {
    const jovianCard = new StormCraftIncorporated();
    player.playedCards.push(jovianCard);

    const venusBefore = game.getVenusScaleLevel();
    card.play(player);
    runAllActions(game);
    expect(game.getVenusScaleLevel()).to.eq(venusBefore + 2);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const target = selectSpace.spaces[0];
    selectSpace.cb(target);
    runAllActions(game);
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    expect(venusSurface.getSpaceOrThrow(target.id).tile?.tileType).to.eq(TileType.VENUS_FLOATER_ARRAY);
    expect(jovianCard.resourceCount).to.eq(3);
  });
});
