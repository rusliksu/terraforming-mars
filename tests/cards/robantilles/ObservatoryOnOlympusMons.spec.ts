import {expect} from 'chai';
import {ObservatoryOnOlympusMons} from '../../../src/server/cards/robantilles/ObservatoryOnOlympusMons';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {Tag} from '../../../src/common/cards/Tag';

describe('ObservatoryOnOlympusMons', () => {
  let card: ObservatoryOnOlympusMons;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ObservatoryOnOlympusMons();
    [/* game */, player] = testGame(2);
  });

  it('draws 1 card per 2 Space tags', () => {
    player.tagsForTest = {[Tag.SPACE]: 4};
    const cardsInHandBefore = player.cardsInHand.length;
    card.play(player);
    expect(player.cardsInHand.length).to.eq(cardsInHandBefore + 2);
  });

  it('draws nothing with no Space tags', () => {
    const cardsInHandBefore = player.cardsInHand.length;
    card.play(player);
    expect(player.cardsInHand.length).to.eq(cardsInHandBefore);
  });
});
