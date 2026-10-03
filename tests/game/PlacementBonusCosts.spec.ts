import {expect} from 'chai';
import {testGame} from '../TestGame';
import {IGame} from '../../src/server/IGame';
import {TestPlayer} from '../TestPlayer';
import {SpaceBonus} from '../../src/common/boards/SpaceBonus';
import {SelectPaymentDeferred} from '../../src/server/deferredActions/SelectPaymentDeferred';
import {cast} from '../../src/common/utils/utils';
import * as constants from '../../src/common/constants';

describe('Game.grantSpaceBonus with a custom board', () => {
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    [game, player] = testGame(2, {
      customBoard: {
        version: 1, name: 'x', rows: 9, spaces: [], milestones: [], awards: [],
        placementBonusCosts: {ocean: 2, temperature: 9, colony: 1},
      },
    });
  });

  it('charges the custom ocean bonus cost', () => {
    game.grantSpaceBonus(player, SpaceBonus.OCEAN);
    const deferred = cast(game.deferredActions.pop(), SelectPaymentDeferred);
    expect(deferred.amount).to.eq(2);
  });

  it('charges the custom temperature bonus cost', () => {
    game.grantSpaceBonus(player, SpaceBonus.TEMPERATURE);
    const deferred = cast(game.deferredActions.pop(), SelectPaymentDeferred);
    expect(deferred.amount).to.eq(9);
  });

  it('charges the custom colony bonus cost', () => {
    game.grantSpaceBonus(player, SpaceBonus.COLONY);
    const deferred = cast(game.deferredActions.pop(), SelectPaymentDeferred);
    expect(deferred.amount).to.eq(1);
  });

  it('TEMPERATURE_4MC keeps the official Vastitas Borealis Nova cost regardless of a custom board', () => {
    game.grantSpaceBonus(player, SpaceBonus.TEMPERATURE_4MC);
    const deferred = cast(game.deferredActions.pop(), SelectPaymentDeferred);
    expect(deferred.amount).to.eq(constants.VASTITAS_BOREALIS_NOVA_BONUS_TEMPERATURE_COST);
  });

  it('grants M€ directly for the MEGACREDITS bonus (a Custom Map Editor placement bonus)', () => {
    const startingMegaCredits = player.megaCredits;
    game.grantSpaceBonus(player, SpaceBonus.MEGACREDITS, 3);
    expect(player.megaCredits).to.eq(startingMegaCredits + 3);
    // Unlike ocean/temperature/colony, this is a free gain -- no SelectPaymentDeferred queued.
    expect(game.deferredActions.length).to.eq(0);
  });

  it('falls back to the official costs when the custom board sets none', () => {
    const [noCostsGame, noCostsPlayer] = testGame(2, {
      customBoard: {version: 1, name: 'x', rows: 9, spaces: [], milestones: [], awards: []},
    });
    noCostsGame.grantSpaceBonus(noCostsPlayer, SpaceBonus.COLONY);
    const deferred = cast(noCostsGame.deferredActions.pop(), SelectPaymentDeferred);
    expect(deferred.amount).to.eq(constants.TERRA_CIMMERIA_COLONY_COST);
  });
});
