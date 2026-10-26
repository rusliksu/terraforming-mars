import {expect} from 'chai';
import {JointVenture} from '../../../src/server/cards/corporatebetterments/JointVenture';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {Resource} from '../../../src/common/Resource';
import {cast} from '../../../src/common/utils/utils';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';

describe('JointVenture', () => {
  let card: JointVenture;
  let game: IGame;
  let player: TestPlayer;
  let opponent: TestPlayer;

  beforeEach(() => {
    card = new JointVenture();
    [game, player, opponent] = testGame(2);
    opponent.production.add(Resource.ENERGY, 2);
  });

  it('can play with an available city space', () => {
    expect(card.canPlay(player)).is.true;
  });

  it('decreases the sole opponent\'s energy production and shares the new city with them', () => {
    const energyBefore = opponent.production.energy;

    card.play(player);
    runAllActions(game);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    selectSpace.cb(selectSpace.spaces[0]);
    runAllActions(game);

    expect(opponent.production.energy).to.eq(energyBefore - 1);

    const city = game.board.spaces.find((space) => space.tile !== undefined && space.player === player);
    expect(city).is.not.undefined;
    expect(city?.coOwner).to.eq(opponent);
    expect(game.board.getCities(opponent)).to.include(city);
  });

  it('is worth 1 victory point', () => {
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
