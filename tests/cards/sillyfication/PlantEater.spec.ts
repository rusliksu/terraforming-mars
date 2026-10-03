import {expect} from 'chai';
import {PlantEater} from '../../../src/server/cards/sillyfication/PlantEater';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('PlantEater', () => {
  let card: PlantEater;
  let player: TestPlayer;

  beforeEach(() => {
    card = new PlantEater();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('requires 2 plant production', () => {
    player.production.override({plants: 1});
    expect(card.canPlay(player)).is.false;
    player.production.override({plants: 2});
    expect(card.canPlay(player)).is.true;
  });

  it('converts plants to 3 times as many M€', () => {
    player.plants = 5;
    player.megaCredits = 0;

    const selectAmount = cast(card.action(player), SelectAmount);
    expect(selectAmount.max).to.eq(5);
    selectAmount.cb(3);

    expect(player.plants).to.eq(2);
    expect(player.megaCredits).to.eq(9);
  });
});
