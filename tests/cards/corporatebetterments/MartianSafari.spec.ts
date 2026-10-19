import {expect} from 'chai';
import {MartianSafari} from '../../../src/server/cards/corporatebetterments/MartianSafari';
import {Fish} from '../../../src/server/cards/base/Fish';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {fakeCard} from '../../TestingUtils';
import {Tag} from '../../../src/common/cards/Tag';

describe('MartianSafari', () => {
  let card: MartianSafari;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new MartianSafari();
    [/* game */, player, player2] = testGame(2);
  });

  it('requires an Animal tag', () => {
    expect(card.canPlay(player)).is.false;
    player.tagsForTest = {animal: 1};
    expect(card.canPlay(player)).is.true;
  });

  it('gains M€ production when this is played, including itself', () => {
    player.playCard(card);
    expect(player.production.megacredits).to.eq(1);
  });

  it('gains M€ production when any player plays an Animal tag', () => {
    player.playedCards.push(card);
    player2.playCard(new Fish());
    expect(player.production.megacredits).to.eq(1);
  });

  it('gains 1 M€ production per Animal tag on the played card', () => {
    player.playedCards.push(card);
    player.playCard(fakeCard({tags: [Tag.ANIMAL, Tag.ANIMAL, Tag.WILD]}));
    expect(player.production.megacredits).to.eq(2);
  });

  it('scores 1 VP per Animal tag', () => {
    player.playedCards.push(card);
    player.tagsForTest = {animal: 3};
    expect(card.getVictoryPoints(player)).eq(3);
  });
});
