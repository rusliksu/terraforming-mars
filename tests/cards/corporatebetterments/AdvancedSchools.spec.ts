import {expect} from 'chai';
import {AdvancedSchools} from '../../../src/server/cards/corporatebetterments/AdvancedSchools';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('AdvancedSchools', () => {
  let card: AdvancedSchools;
  let player: TestPlayer;
  let opponent: TestPlayer;

  beforeEach(() => {
    card = new AdvancedSchools();
    [/* game */, player, opponent] = testGame(2);
  });

  it('pays the player 3 M€ per science tag, including this card, and opponents 1 M€ per science tag', () => {
    player.tagsForTest = {science: 2};
    opponent.tagsForTest = {science: 1};

    const megaCreditsBefore = player.megaCredits;
    const opponentMegaCreditsBefore = opponent.megaCredits;

    card.play(player);

    // 2 existing science tags + 1 for this card = 3, times 3 M€ each.
    expect(player.megaCredits).to.eq(megaCreditsBefore + 9);
    expect(opponent.megaCredits).to.eq(opponentMegaCreditsBefore + 1);
  });

  it('grants nothing to an opponent with no science tags', () => {
    opponent.tagsForTest = {science: 0};
    const opponentMegaCreditsBefore = opponent.megaCredits;

    card.play(player);

    expect(opponent.megaCredits).to.eq(opponentMegaCreditsBefore);
  });
});
