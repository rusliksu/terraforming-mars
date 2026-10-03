import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {PreciousMetalAsteroid} from '../../../src/server/cards/idesofmars/PreciousMetalAsteroid';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {SpaceBonus} from '../../../src/common/boards/SpaceBonus';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('PreciousMetalAsteroid', () => {
  let card: PreciousMetalAsteroid;
  let player: TestPlayer;
  let otherPlayer: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new PreciousMetalAsteroid();
    [game, player, otherPlayer] = testGame(2);
  });

  it('raises temperature, gains M€, marks 3 areas, and defers plant removal', () => {
    player.megaCredits = 0;
    otherPlayer.plants = 5;
    expect(game.getTemperature()).eq(-30);
    expect(game.deferredActions).has.lengthOf(0);

    const first = cast(card.play(player), SelectSpace);

    expect(game.getTemperature()).eq(-28);
    expect(player.megaCredits).eq(5);
    // The plant removal is queued as a deferred action, and left untested in depth here,
    // consistent with MetallicAsteroid's own test of the same underlying behavior.
    expect(game.deferredActions).has.lengthOf(1);

    const space1 = first.spaces[0];
    first.cb(space1);

    const second = cast(game.deferredActions.pop()!.execute(), SelectSpace);
    expect(second.spaces).does.not.include(space1);
    const space2 = second.spaces[0];
    second.cb(space2);

    const third = cast(game.deferredActions.pop()!.execute(), SelectSpace);
    expect(third.spaces).does.not.include(space1);
    expect(third.spaces).does.not.include(space2);
    const space3 = third.spaces[0];
    third.cb(space3);

    for (const space of [space1, space2, space3]) {
      expect(space.bonus.filter((bonus) => bonus === SpaceBonus.MEGACREDITS)).has.lengthOf(5);
    }

    // Only the queued plant-removal deferred action remains.
    expect(game.deferredActions).has.lengthOf(1);
  });
});
