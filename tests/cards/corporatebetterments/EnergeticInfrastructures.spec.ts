import {expect} from 'chai';
import {EnergeticInfrastructures} from '../../../src/server/cards/corporatebetterments/EnergeticInfrastructures';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('EnergeticInfrastructures', () => {
  let card: EnergeticInfrastructures;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new EnergeticInfrastructures();
    [, player, player2] = testGame(2);
  });

  it('gains 5 M€ per Power tag owned, including this, and opponents gain 2 M€ per their own Power tags', () => {
    player.tagsForTest = {power: 2};
    player2.tagsForTest = {power: 3};

    card.play(player);

    // 2 Power tags already owned + 1 for this card = 3 tags, at 5 M€ each.
    expect(player.megaCredits).eq(15);
    expect(player2.megaCredits).eq(6);
  });

  it('opponents with no Power tags gain nothing', () => {
    player.tagsForTest = {power: 0};
    player2.tagsForTest = {power: 0};

    card.play(player);

    expect(player.megaCredits).eq(5);
    expect(player2.megaCredits).eq(0);
  });
});
