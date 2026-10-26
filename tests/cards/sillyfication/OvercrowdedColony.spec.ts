import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {OvercrowdedColony} from '../../../src/server/cards/sillyfication/OvercrowdedColony';
import {SelectColony} from '../../../src/server/inputs/SelectColony';
import {ColonyName} from '../../../src/common/colonies/ColonyName';
import {IGame} from '../../../src/server/IGame';
import {IColony} from '../../../src/server/colonies/IColony';
import {cast} from '@/common/utils/utils';
import {runAllActions} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';

describe('OvercrowdedColony', () => {
  let card: OvercrowdedColony;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;
  let ganymede: IColony;

  beforeEach(() => {
    card = new OvercrowdedColony();
    [game, player, player2] = testGame(2, {
      coloniesExtension: true,
      customColoniesList: [
        ColonyName.GANYMEDE,
        ColonyName.LUNA,
        ColonyName.PLUTO,
        ColonyName.TITAN,
        ColonyName.TRITON],
    });
    ganymede = game.colonies.find((c) => c.name === ColonyName.GANYMEDE)!;
  });

  it('cannot be played when no colony tile is full', () => {
    ganymede.colonies = [player2.id, player2.id];
    expect(card.canPlay(player)).is.false;
  });

  it('can be played once a colony tile has 3 colonies', () => {
    ganymede.colonies = [player2.id, player2.id, player2.id];
    expect(card.canPlay(player)).is.true;
  });

  it('is worth -2 VP', () => {
    expect(card.getVictoryPoints(player)).eq(-2);
  });

  it('adds a fourth colony, grants the placement bonus, and trades for free', () => {
    ganymede.colonies = [player2.id, player2.id, player2.id];
    ganymede.trackPosition = 3;
    const plantsProdBefore = player.production.plants;
    const plantsBefore = player.plants;

    const selectColony = cast(card.play(player), SelectColony);
    expect(selectColony.colonies).deep.eq([ganymede]);
    selectColony.cb(ganymede);
    runAllActions(game);

    // 4th colony on the tile, in build order.
    expect(ganymede.colonies).deep.eq([player2.id, player2.id, player2.id, player.id]);
    // Ganymede build bonus: +1 plant production.
    expect(player.production.plants).eq(plantsProdBefore + 1);
    // Free trade income (Ganymede pays plants by track position).
    expect(player.plants).is.greaterThan(plantsBefore);
  });
});
