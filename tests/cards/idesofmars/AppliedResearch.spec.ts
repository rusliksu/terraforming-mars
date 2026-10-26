import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {AppliedResearch} from '../../../src/server/cards/idesofmars/AppliedResearch';
import {SellPatentsStandardProject} from '../../../src/server/cards/base/standardProjects/SellPatentsStandardProject';
import {CityStandardProject} from '../../../src/server/cards/base/standardProjects/CityStandardProject';
import {TestPlayer} from '../../TestPlayer';

describe('AppliedResearch', () => {
  let card: AppliedResearch;
  let player: TestPlayer;

  beforeEach(() => {
    card = new AppliedResearch();
    [/* game */, player] = testGame(1);
  });

  it('requires 2 Science tags', () => {
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {science: 2};
    expect(card.canPlay(player)).is.true;
  });

  it('draws a card when a standard project is used', () => {
    const cardsInHand = player.cardsInHand.length;
    card.onStandardProject(player, new CityStandardProject());
    expect(player.cardsInHand.length).to.eq(cardsInHand + 1);
  });

  it('does not draw a card for Sell Patents', () => {
    const cardsInHand = player.cardsInHand.length;
    card.onStandardProject(player, new SellPatentsStandardProject());
    expect(player.cardsInHand.length).to.eq(cardsInHand);
  });
});
