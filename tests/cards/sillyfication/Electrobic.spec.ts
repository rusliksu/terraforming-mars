import {expect} from 'chai';
import {Electrobic} from '../../../src/server/cards/sillyfication/Electrobic';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('Electrobic', () => {
  let card: Electrobic;
  let player: TestPlayer;

  beforeEach(() => {
    card = new Electrobic();
    [/* game */, player] = testGame(2);
  });

  it('requires 3 plants to play', () => {
    player.plants = 2;
    expect(card.canPlay(player)).is.false;
    player.plants = 3;
    expect(card.canPlay(player)).is.true;
  });

  it('spends 3 plants for 2 energy production', () => {
    player.plants = 3;
    player.production.override({energy: 0});

    card.play(player);

    expect(player.plants).to.eq(0);
    expect(player.production.energy).to.eq(2);
  });
});
