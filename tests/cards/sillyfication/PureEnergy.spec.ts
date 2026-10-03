import {expect} from 'chai';
import {PureEnergy} from '../../../src/server/cards/sillyfication/PureEnergy';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('PureEnergy', () => {
  let card: PureEnergy;
  let player: TestPlayer;

  beforeEach(() => {
    card = new PureEnergy();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('gains 7 energy production on play', () => {
    player.production.override({energy: 0});
    card.play(player);
    expect(player.production.energy).to.eq(7);
  });

  it('reduces its own cost by your energy resource + Power tag count + energy production', () => {
    player.tagsForTest = {power: 3};
    player.energy = 4;
    player.production.override({energy: 2});

    expect(card.getOwnCostReduction(player)).to.eq(9); // 4 + 3 + 2
    expect(player.getCardCost(card)).to.eq(35 - 9);
  });
});
