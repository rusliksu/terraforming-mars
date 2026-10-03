import {expect} from 'chai';
import {LongDistanceRelations} from '../../../src/server/cards/sillyfication/LongDistanceRelations';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('LongDistanceRelations', () => {
  let card: LongDistanceRelations;
  let player: TestPlayer;

  beforeEach(() => {
    card = new LongDistanceRelations();
    [/* game */, player] = testGame(2);
  });

  it('raises M€ production per Jovian tag, including this, and scores 1 VP', () => {
    player.tagsForTest = {jovian: 2};

    card.play(player);

    // 2 existing + 1 from this card.
    expect(player.production.megacredits).to.eq(3);
    expect(card.getVictoryPoints(player)).to.eq(1);
  });

  it('counts just its own Jovian tag with no others', () => {
    card.play(player);
    expect(player.production.megacredits).to.eq(1);
  });
});
