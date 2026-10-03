import {expect} from 'chai';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame, runAllActions} from '../../TestingUtils';
import {GasMineStandardProject} from '../../../src/server/cards/venusPhase2/GasMineStandardProject';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {SpaceType} from '../../../src/common/boards/SpaceType';
import {Payment} from '../../../src/common/inputs/Payment';
import {cast} from '@/common/utils/utils';

import {AndOptions} from '@/server/inputs/AndOptions';
import {SelectStandardProjectToPlay} from '@/server/inputs/SelectStandardProjectToPlay';
import {StormCraftIncorporated} from '@/server/cards/colonies/StormCraftIncorporated';

describe('GasMineStandardProject', () => {
  let game: IGame;
  let player: TestPlayer;
  let card: GasMineStandardProject;

  beforeEach(() => {
    [game, player] = testGame(2, {venusPhase2Expansion: true});
    card = new GasMineStandardProject();
  });

  it('is offered in the grouped Standard Projects list', () => {
    const names = game.getStandardProjects().map((c) => c.name);
    expect(names).to.include(card.name);
  });

  it('cannot act once every gaslight space is taken, even with plenty of M€', () => {
    player.megaCredits = 999;
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    for (const space of venusSurface.getAvailableSpacesForGaslight(player)) {
      VenusPhase2Expansion.addGasMineTile(player, space.id);
    }
    expect(card.canAct(player)).is.false;
  });

  it('places a Gas Mine on a gaslight space (never a plain land space) and grants +1 heat production', () => {
    player.megaCredits = 999;
    card.payAndExecute(player, Payment.of({megacredits: card.cost}));
    runAllActions(game);

    const spaceSelect = cast(player.popWaitingFor(), SelectSpace);
    expect(spaceSelect.spaces.every((s) => s.spaceType === SpaceType.GASLIGHT)).is.true;
    const target = spaceSelect.spaces[0];
    spaceSelect.cb(target);
    runAllActions(game);

    expect(player.megaCredits).to.eq(999 - card.cost);
    expect(player.production.heat).to.eq(1);
    expect(game.getVenusScaleLevel()).to.eq(2); // 1 raise-step, at the official 2%-per-step rate.
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    expect(venusSurface.getSpaceOrThrow(target.id).tile?.tileType).to.eq(TileType.VENUS_GAS_MINE);
  });

  it('canPayWith advertises anyFloaters', () => {
    expect(card.canPayWith()).to.deep.eq({anyFloaters: true});
  });
  it('rejects counting one Stormcraft floater both as heat and as a floater', () => {
    const stormcraft = new StormCraftIncorporated();
    stormcraft.resourceCount = 1;
    player.playedCards.push(stormcraft);
    player.canUseHeatAsMegaCredits = true;
    player.megaCredits = 16;
    expect(card.canAct(player)).is.false;
    const input = new SelectStandardProjectToPlay(player, [card]);
    expect(() => input.process({type: 'projectCard', card: card.name, payment: Payment.of({megacredits: 16, heat: 2, anyFloaters: 1})})).to.throw();
    expect(player.megaCredits).eq(16);
    expect(stormcraft.resourceCount).eq(1);
  });
  it('allocates separate Stormcraft floaters to heat and floater payments', () => {
    const stormcraft = new StormCraftIncorporated();
    stormcraft.resourceCount = 2;
    player.playedCards.push(stormcraft);
    player.canUseHeatAsMegaCredits = true;
    player.megaCredits = 16;
    const input = new SelectStandardProjectToPlay(player, [card]);
    input.process({type: 'projectCard', card: card.name, payment: Payment.of({megacredits: 16, heat: 2, anyFloaters: 1})});
    runAllActions(game);
    const heatPayment = cast(player.popWaitingFor(), AndOptions);
    heatPayment.process({type: 'and', responses: [{type: 'amount', amount: 0}, {type: 'amount', amount: 1}]}, player);
    runAllActions(game);
    expect(stormcraft.resourceCount).eq(0);
    expect(player.megaCredits).eq(0);
    expect(player.popWaitingFor()).instanceOf(SelectSpace);
  });
});
