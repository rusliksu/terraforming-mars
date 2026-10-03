import {expect} from 'chai';
import {ColdBlooded} from '../../../src/server/cards/sillyfication/ColdBlooded';
import {GlobalParameter} from '../../../src/common/GlobalParameter';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('ColdBlooded', () => {
  let card: ColdBlooded;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ColdBlooded();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('requires 5% oxygen', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('costs 15 M€', () => {
    expect(card.cost).to.eq(15);
  });

  it('gains animals equal to the temperature steps you raise', () => {
    card.onGlobalParameterIncrease(player, GlobalParameter.TEMPERATURE, 2);
    expect(card.resourceCount).to.eq(2);
  });

  it('ignores other global parameters', () => {
    card.onGlobalParameterIncrease(player, GlobalParameter.OXYGEN, 1);
    expect(card.resourceCount).to.eq(0);
  });
});
