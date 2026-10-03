import {expect} from 'chai';
import {VenusianSubsidiary} from '../../../src/server/cards/sillyfication/VenusianSubsidiary';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('VenusianSubsidiary', () => {
  let card: VenusianSubsidiary;
  let player: TestPlayer;

  beforeEach(() => {
    card = new VenusianSubsidiary();
    [/* game */, player] = testGame(2, {venusNextExtension: true});
    player.megaCredits = 20;
  });

  it('has no play requirement', () => {
    expect(card.canPlay(player)).is.true;
  });

  it('can always act', () => {
    expect(card.canAct()).is.true;
  });

  it('action gains 1 M€ per Venus/Earth pair', () => {
    player.megaCredits = 0;
    player.tagsForTest = {venus: 3, earth: 2};

    card.action(player);

    // min(3, 2) = 2 pairs.
    expect(player.megaCredits).to.eq(2);
  });

  it('action gains nothing without a matching pair', () => {
    player.megaCredits = 0;
    player.tagsForTest = {venus: 4, earth: 0};

    card.action(player);

    expect(player.megaCredits).to.eq(0);
  });

  it('action assigns each wild tag to the side that is behind', () => {
    player.megaCredits = 0;
    player.tagsForTest = {venus: 3, earth: 1, wild: 2};

    card.action(player);

    // wild #1 -> earth (2), wild #2 -> earth (3); min(3, 3) = 3 pairs.
    expect(player.megaCredits).to.eq(3);
  });
});
