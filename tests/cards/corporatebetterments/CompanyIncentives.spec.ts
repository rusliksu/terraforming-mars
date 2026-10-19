import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {CompanyIncentives} from '../../../src/server/cards/corporatebetterments/CompanyIncentives';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {SpaceBonus} from '../../../src/common/boards/SpaceBonus';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('CompanyIncentives', () => {
  let card: CompanyIncentives;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new CompanyIncentives();
    [game, player] = testGame(2);
  });

  it('marks 3 different empty areas with a 5 M€ tile-placement bonus', () => {
    const first = cast(card.play(player), SelectSpace);
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

    expect(game.deferredActions.pop()).is.undefined;

    for (const space of [space1, space2, space3]) {
      expect(space.bonus.filter((bonus) => bonus === SpaceBonus.MEGACREDITS)).has.lengthOf(5);
    }
  });
});
