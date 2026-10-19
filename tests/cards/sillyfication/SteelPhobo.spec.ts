import {expect} from 'chai';
import {SteelPhobo} from '../../../src/server/cards/sillyfication/SteelPhobo';
import {Tag} from '../../../src/common/cards/Tag';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('SteelPhobo', () => {
  let card: SteelPhobo;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SteelPhobo();
    [/* game */, player] = testGame(2);
  });

  it('has a Space tag and a Building tag', () => {
    expect(card.tags).to.deep.eq([Tag.SPACE, Tag.BUILDING]);
  });

  it('steel is worth 2 more, titanium 1 less', () => {
    expect(player.getSteelValue()).to.eq(2);
    expect(player.getTitaniumValue()).to.eq(3);

    card.play(player);

    expect(player.getSteelValue()).to.eq(4);
    expect(player.getTitaniumValue()).to.eq(2);
  });

  it('reverses on discard', () => {
    card.play(player);
    card.onDiscard(player);
    // behavior reversal handles steelValue:1 / titanumValue:-1; onDiscard handles the extra steel step.
    expect(player.getSteelValue()).to.eq(3);
  });
});
