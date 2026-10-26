import {expect} from 'chai';
import {vi} from 'vitest';
import {keepDraftCardOrder} from '@/client/wrybit/inputs/draftCards';
import {CardName} from '@/common/cards/CardName';

describe('draft display order storage boundary', () => {
  afterEach(() => {
    sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it('falls back to the native packet for malformed, duplicate or unavailable cached storage', () => {
    const cards = [{name: CardName.ANTS}, {name: CardName.BIRDS}];
    const key = 'wrybit:draft-card-order:synthetic-order-owner';
    for (const stored of ['{broken', '{"length":2}', JSON.stringify([CardName.BIRDS, CardName.BIRDS])]) {
      sessionStorage.setItem(key, stored);
      expect(keepDraftCardOrder('synthetic-order-owner', cards)).eq(cards);
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Storage disabled');
    });
    expect(keepDraftCardOrder('synthetic-order-owner', cards)).eq(cards);
  });
});
