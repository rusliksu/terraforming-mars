import {expect} from 'chai';
import {ChipFabricationPlant} from '../../../src/server/cards/sillyfication/ChipFabricationPlant';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('ChipFabricationPlant', () => {
  let card: ChipFabricationPlant;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ChipFabricationPlant();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('cannot be played with more than 1 plant tag', () => {
    player.tagsForTest = {plant: 2};
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {plant: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act without energy', () => {
    player.energy = 0;
    expect(card.canAct(player)).is.false;
    player.energy = 1;
    expect(card.canAct(player)).is.true;
  });

  it('converts any number of energy to the same amount of steel', () => {
    player.energy = 6;
    player.steel = 0;

    const selectAmount = cast(card.action(player), SelectAmount);
    expect(selectAmount.max).to.eq(6);
    selectAmount.cb(4);

    expect(player.energy).to.eq(2);
    expect(player.steel).to.eq(4);
  });
});
