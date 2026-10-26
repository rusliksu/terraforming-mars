import {expect} from 'chai';
import {Microbetronics} from '../../../src/server/cards/sillyfication/Microbetronics';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('Microbetronics', () => {
  let card: Microbetronics;
  let player: TestPlayer;

  beforeEach(() => {
    card = new Microbetronics();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
    player.production.override({energy: 0});
  });

  it('gains 1 energy production for every 2 microbe tags, including its own', () => {
    // tagsForTest overrides raw tag counting entirely, so include Microbetronics' own microbe tag here.
    player.tagsForTest = {microbe: 1};
    card.onCardPlayed(player, card);
    expect(player.production.energy).to.eq(0);

    player.tagsForTest = {microbe: 2};
    card.onCardPlayed(player, card);
    expect(player.production.energy).to.eq(1);

    player.tagsForTest = {microbe: 4};
    card.onCardPlayed(player, card);
    expect(player.production.energy).to.eq(2);
  });

  it('does not re-grant production for the same total', () => {
    player.tagsForTest = {microbe: 2};
    card.onCardPlayed(player, card);
    expect(player.production.energy).to.eq(1);

    card.onCardPlayed(player, card);
    expect(player.production.energy).to.eq(1);
  });
});
