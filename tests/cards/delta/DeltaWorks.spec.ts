import {expect} from 'chai';
import {DeltaWorks, TradeWithSteel} from '../../../src/server/cards/delta/DeltaWorks';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {DeltaProjectExpansion, DELTA_TRACK_TAGS} from '../../../src/server/delta/DeltaProjectExpansion';
import {Tag} from '../../../src/common/cards/Tag';
import {fakeCard} from '../../TestingUtils';
import {Luna} from '../../../src/server/colonies/Luna';
import {CardType} from '../../../src/common/cards/CardType';

describe('DeltaWorks', () => {
  let player: TestPlayer;

  beforeEach(() => {
    [/* game */, player] = testGame(2, {deltaProjectExpansion: true});
    player.playedCards.push(fakeCard({tags: DELTA_TRACK_TAGS.filter((t): t is Tag => t !== undefined)}));
  });

  it('is a blue (Active) card', () => {
    expect(new DeltaWorks().type).eq(CardType.ACTIVE);
  });

  it('without Delta Works, steel does not count toward Delta Project steps', () => {
    player.energy = 1;
    player.steel = 5;
    expect(DeltaProjectExpansion.maxSteps(player)).eq(1);
  });

  it('with Delta Works, steel counts as energy for Delta Project steps', () => {
    player.playedCards.push(new DeltaWorks());
    player.energy = 1;
    player.steel = 2;
    expect(DeltaProjectExpansion.maxSteps(player)).eq(3);
  });

  it('spends energy first, then steel', () => {
    player.playedCards.push(new DeltaWorks());
    player.energy = 1;
    player.steel = 2;

    DeltaProjectExpansion.advance(player, 3);

    expect(player.energy).eq(0);
    expect(player.steel).eq(0);
  });

  it('does not spend steel if energy alone covers the cost', () => {
    player.playedCards.push(new DeltaWorks());
    player.energy = 3;
    player.steel = 2;

    DeltaProjectExpansion.advance(player, 2);

    expect(player.energy).eq(1);
    expect(player.steel).eq(2);
  });

  describe('TradeWithSteel (colony trading)', () => {
    it('cannot be used without Delta Works', () => {
      player.steel = 5;
      expect(new TradeWithSteel(player).canUse()).is.false;
    });

    it('cannot be used without enough steel', () => {
      player.playedCards.push(new DeltaWorks());
      player.steel = 1;
      expect(new TradeWithSteel(player).canUse()).is.false;
    });

    it('trades using steel at the energy trade rate', () => {
      player.playedCards.push(new DeltaWorks());
      player.steel = 3;
      const trader = new TradeWithSteel(player);
      expect(trader.canUse()).is.true;

      trader.trade(new Luna());

      expect(player.steel).eq(0);
    });
  });
});
