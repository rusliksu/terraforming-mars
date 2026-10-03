import {expect} from 'chai';
import {MiningOutpost} from '../../../src/server/cards/robantilles/MiningOutpost';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {PlaceCityTile} from '../../../src/server/deferredActions/PlaceCityTile';
import {cast} from '../../../src/common/utils/utils';
import {Resource} from '../../../src/common/Resource';

describe('MiningOutpost', () => {
  let card: MiningOutpost;
  let player: TestPlayer;

  beforeEach(() => {
    card = new MiningOutpost();
    [/* game */, player] = testGame(1);
  });

  it('changes production and places a city tile', () => {
    player.production.add(Resource.ENERGY, 1);

    cast(card.play(player), undefined);

    expect(player.production.energy).to.eq(0);
    expect(player.production.titanium).to.eq(1);
    expect(player.game.deferredActions.peek()).instanceOf(PlaceCityTile);
  });
});
