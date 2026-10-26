import {expect} from 'chai';
import {SlowGrowthPlantation} from '../../../src/server/cards/corporatebetterments/SlowGrowthPlantation';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setOxygenLevel, runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {cast} from '../../../src/common/utils/utils';

describe('SlowGrowthPlantation', () => {
  let card: SlowGrowthPlantation;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new SlowGrowthPlantation();
    [game, player] = testGame(2);
  });

  it('requires 4% oxygen', () => {
    setOxygenLevel(game, 3);
    expect(card.canPlay(player)).is.false;
    setOxygenLevel(game, 4);
    expect(card.canPlay(player)).is.true;
  });

  it('adds 3 microbes on play', () => {
    setOxygenLevel(game, 4);
    player.playedCards.push(card);
    card.play(player);
    runAllActions(game);
    expect(card.resourceCount).to.eq(3);
  });

  it('adds 1 microbe when fewer than 5 are here', () => {
    player.playedCards.push(card);
    card.action(player);
    runAllActions(game);
    expect(card.resourceCount).to.eq(1);
  });

  it('offers a choice once 5 microbes are here', () => {
    player.playedCards.push(card);
    player.addResourceTo(card, 5);
    card.action(player);
    const orOptions = cast(game.deferredActions.pop()!.execute(), OrOptions);
    expect(orOptions.options).has.lengthOf(2);
  });

  it('can remove 5 microbes to place a greenery', () => {
    player.playedCards.push(card);
    player.addResourceTo(card, 5);
    card.action(player);
    const orOptions = cast(game.deferredActions.pop()!.execute(), OrOptions);
    orOptions.options[1].cb(undefined);
    expect(card.resourceCount).to.eq(0);

    const selectSpace = cast(game.deferredActions.pop()!.execute(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);
    expect(game.board.getGreeneries(player)).has.lengthOf(1);
  });
});
