import {expect} from 'chai';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame, runAllActions} from '../../TestingUtils';
import {FloaterArrayStandardProject} from '../../../src/server/cards/venusPhase2/FloaterArrayStandardProject';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {Payment} from '../../../src/common/inputs/Payment';
import {cast} from '@/common/utils/utils';

describe('FloaterArrayStandardProject', () => {
  let game: IGame;
  let player: TestPlayer;
  let card: FloaterArrayStandardProject;

  beforeEach(() => {
    [game, player] = testGame(2, {venusPhase2Expansion: true});
    card = new FloaterArrayStandardProject();
  });

  it('is offered in the grouped Standard Projects list', () => {
    const names = game.getStandardProjects().map((c) => c.name);
    expect(names).to.include(card.name);
  });

  it('places a tile and grants no production, unlike Cloud City/Gas Mine', () => {
    player.megaCredits = 999;
    card.payAndExecute(player, Payment.of({megacredits: card.cost}));
    runAllActions(game);

    const spaceSelect = cast(player.popWaitingFor(), SelectSpace);
    const target = spaceSelect.spaces[0];
    spaceSelect.cb(target);
    runAllActions(game);

    expect(player.megaCredits).to.eq(999 - card.cost);
    expect(player.production.megacredits).to.eq(0);
    expect(player.production.heat).to.eq(0);
    expect(game.getVenusScaleLevel()).to.eq(2); // 1 raise-step, at the official 2%-per-step rate.
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    expect(venusSurface.getSpaceOrThrow(target.id).tile?.tileType).to.eq(TileType.VENUS_FLOATER_ARRAY);
  });

  it('canPayWith advertises anyFloaters', () => {
    expect(card.canPayWith()).to.deep.eq({anyFloaters: true});
  });
});
