import {expect} from 'chai';
import {getCardsByType} from '@/client/utils/CardUtils';
import {CardType} from '@/common/cards/CardType';
import {CardName} from '@/common/cards/CardName';
import {CardModel} from '@/common/models/CardModel';

describe('CardUtils', () => {
  it('keeps dynamic custom cards in their played-card category', () => {
    const card: CardModel = {name: 'Smoke custom card' as CardName, customCard: {
      type: CardType.AUTOMATED, cost: 4, tags: [], requirements: [],
      metadata: {description: 'Custom effect'}, module: 'customCards', compatibility: [],
    }};
    expect(getCardsByType([card], [CardType.AUTOMATED])).deep.eq([card]);
    expect(getCardsByType([card], [CardType.EVENT])).deep.eq([]);
  });
});
