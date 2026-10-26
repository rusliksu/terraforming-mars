import {expect} from 'chai';
import {VitorVitalis} from '../../../src/server/cards/sillyfication/VitorVitalis';
import {Fish} from '../../../src/server/cards/base/Fish'; // 1 VP per animal (dynamic)
import {MicroCredits} from '../../../src/server/cards/sillyfication/MicroCredits'; // no VP
import {Flooding} from '../../../src/server/cards/base/Flooding'; // -1 VP
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('VitorVitalis', () => {
  let card: VitorVitalis;
  let player: TestPlayer;

  beforeEach(() => {
    card = new VitorVitalis();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
    player.megaCredits = 0;
  });

  it('requires 4 science tags; scores 3 VP', () => {
    player.tagsForTest = {science: 3};
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {science: 4};
    expect(card.canPlay(player)).is.true;
    expect(card.getVictoryPoints(player)).to.eq(3);
  });

  it('gains 1 M€ on a non-negative VP card, nothing otherwise', () => {
    card.onCardPlayed(player, new Fish());
    expect(player.megaCredits).to.eq(1);

    card.onCardPlayed(player, new MicroCredits());
    expect(player.megaCredits).to.eq(1);

    card.onCardPlayed(player, new Flooding());
    expect(player.megaCredits).to.eq(1);
  });
});
