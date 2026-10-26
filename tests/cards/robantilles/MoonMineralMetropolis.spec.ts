import {expect} from 'chai';
import {MoonMineralMetropolis} from '../../../src/server/cards/robantilles/MoonMineralMetropolis';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {PlaceMoonHabitatTile} from '../../../src/server/moon/PlaceMoonHabitatTile';

describe('MoonMineralMetropolis', () => {
  let card: MoonMineralMetropolis;
  let player: TestPlayer;

  beforeEach(() => {
    [/* game */, player] = testGame(1, {moonExpansion: true});
    card = new MoonMineralMetropolis();
  });

  it('increases steel production 4 steps and places a habitat tile on The Moon', () => {
    card.play(player);

    expect(player.production.steel).to.eq(4);
    expect(player.game.deferredActions.peek()).instanceOf(PlaceMoonHabitatTile);
  });
});
