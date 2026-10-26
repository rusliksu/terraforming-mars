import {expect} from 'chai';
import {InsiderTrading} from '../../../src/server/cards/sillyfication/InsiderTrading';
import {Tag} from '../../../src/common/cards/Tag';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('InsiderTrading', () => {
  let card: InsiderTrading;
  let player: TestPlayer;

  beforeEach(() => {
    card = new InsiderTrading();
    [/* game */, player] = testGame(2, {preludeExtension: true, underworldExpansion: true});
  });

  it('has a crime tag', () => {
    expect(card.tags).to.deep.eq([Tag.CRIME]);
  });

  it('gains 4 corruption', () => {
    const before = player.underworldData.corruption;
    card.play(player);
    expect(player.underworldData.corruption).to.eq(before + 4);
  });
});
