import {expect} from 'chai';
import {NukeAnAsteroid} from '../../../src/server/cards/corporatebetterments/NukeAnAsteroid';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {AndOptions} from '../../../src/server/inputs/AndOptions';

describe('NukeAnAsteroid', () => {
  let card: NukeAnAsteroid;

  beforeEach(() => {
    card = new NukeAnAsteroid();
  });

  it('increases titanium production 2 steps', () => {
    const [/* game */, player] = testGame(2);
    const before = player.production.titanium;

    card.play(player);

    expect(player.production.titanium).to.eq(before + 2);
  });

  it('with a single opponent, gives them all 5 titanium', () => {
    const [game, player, opponent] = testGame(2);

    card.play(player);
    runAllActions(game);

    expect(opponent.stock.titanium).to.eq(5);
  });

  it('with multiple opponents, distributes 5 titanium among any number of them', () => {
    const [game, player, opp1, opp2] = testGame(3);

    const options = cast(card.play(player), AndOptions);
    expect(options.options).has.lengthOf(2);
    options.options[0].cb(3);
    options.options[1].cb(2);
    options.cb(undefined);
    runAllActions(game);

    expect(opp1.stock.titanium).to.eq(3);
    expect(opp2.stock.titanium).to.eq(2);
  });

  it('rejects a distribution that does not sum to 5', () => {
    const [/* game */, player] = testGame(3);

    const options = cast(card.play(player), AndOptions);
    options.options[0].cb(3);
    options.options[1].cb(3);
    expect(() => options.cb(undefined)).to.throw(/Expecting 5 titanium/);
  });
});
