import {expect} from 'chai';
import {Venuphile} from '../../../src/server/cards/sillyfication/Venuphile';
import {Tag} from '../../../src/common/cards/Tag';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('Venuphile', () => {
  let card: Venuphile;
  let player: TestPlayer;

  beforeEach(() => {
    card = new Venuphile();
    [/* game */, player] = testGame(2, {venusNextExtension: true});
    player.playedCards.push(card);
  });

  it('discounts Venus cards 1 M€ for every 2 Venus tags you have', () => {
    player.tagsForTest = {venus: 3};
    const venusCard = {tags: [Tag.VENUS]} as any;
    const otherCard = {tags: [Tag.EARTH]} as any;

    expect(card.getCardDiscount(player, venusCard)).to.eq(1);
    expect(card.getCardDiscount(player, otherCard)).to.eq(0);
  });

  it('rounds the discount down', () => {
    player.tagsForTest = {venus: 4};
    const venusCard = {tags: [Tag.VENUS]} as any;

    expect(card.getCardDiscount(player, venusCard)).to.eq(2);
  });

  it('caps the discount at 5 M€', () => {
    player.tagsForTest = {venus: 16};
    const venusCard = {tags: [Tag.VENUS]} as any;

    expect(card.getCardDiscount(player, venusCard)).to.eq(5);
  });
});
