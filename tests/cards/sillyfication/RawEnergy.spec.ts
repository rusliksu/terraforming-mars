import {expect} from 'chai';
import {RawEnergy} from '../../../src/server/cards/sillyfication/RawEnergy';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('RawEnergy', () => {
  let card: RawEnergy;
  let player: TestPlayer;

  beforeEach(() => {
    card = new RawEnergy();
    [/* game */, player] = testGame(2);
  });

  it('loses 1 TR and gains 4 energy production', () => {
    const trBefore = player.terraformRating;
    player.production.override({energy: 0});

    card.play(player);

    expect(player.terraformRating).to.eq(trBefore - 1);
    expect(player.production.energy).to.eq(4);
  });

  it('is worth -1 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(-1);
  });
});
