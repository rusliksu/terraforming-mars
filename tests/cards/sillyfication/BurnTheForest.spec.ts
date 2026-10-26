import {expect} from 'chai';
import {BurnTheForest} from '../../../src/server/cards/sillyfication/BurnTheForest';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('BurnTheForest', () => {
  let card: BurnTheForest;
  let player: TestPlayer;

  beforeEach(() => {
    card = new BurnTheForest();
    [/* game */, player] = testGame(2);
  });

  it('cannot be played without a greenery', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('scores -1 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(-1);
  });

  it('replaces a greenery with the tile, keeping placement bonuses, raises temperature 2 steps, and gains 6 heat', () => {
    const game = player.game;
    const space = game.board.getAvailableSpacesOnLand(player)[0];
    game.addGreenery(player, space);
    expect(card.canPlay(player)).is.true;

    const temperatureBefore = game.getTemperature();
    const selectSpace = cast(card.play(player), SelectSpace);
    selectSpace.cb(space);

    expect(space.tile?.tileType).to.eq(TileType.GARBAGE_DUMP);
    expect(game.getTemperature()).to.eq(temperatureBefore + 4);
    expect(player.heat).to.eq(6);
  });
});
