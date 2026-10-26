import {expect} from 'chai';
import {MartianHour} from '../../../src/server/cards/idesofmars/MartianHour';
import {testGame} from '../../TestGame';

describe('MartianHour', () => {
  it('grants 2 more actions this round', () => {
    const card = new MartianHour();
    const [/* game */, player] = testGame(1);
    const previousActions = player.availableActionsThisRound;

    card.bespokePlay(player);

    expect(player.availableActionsThisRound).to.eq(previousActions + 2);
  });

  it('is a free event card', () => {
    const card = new MartianHour();
    expect(card.cost).to.eq(0);
  });
});
