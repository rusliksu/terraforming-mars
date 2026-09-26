import {expect} from 'chai';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {CardRenderItemType} from '@/common/cards/render/CardRenderItemType';
import {newCardDraft, parseCardDraft, previewCard} from '@/client/components/cardmaker/CardDraft';

describe('CardDraft', () => {
  it('round-trips a draft into the normal card preview model', () => {
    const draft = newCardDraft();
    draft.name = 'Test Mining Project';
    draft.type = CardType.EVENT;
    draft.cost = 6;
    draft.tags = [Tag.BUILDING];
    draft.iconType = CardRenderItemType.STEEL;
    draft.iconAmount = 5;
    draft.description = 'Gain 5 steel.';

    const loaded = parseCardDraft(JSON.stringify(draft));
    const preview = previewCard(loaded);
    expect(loaded).deep.eq(draft);
    expect(preview.name).eq('Test Mining Project');
    expect(preview.cost).eq(6);
    expect(preview.tags).deep.eq([Tag.BUILDING]);
    expect(preview.metadata.renderData).deep.eq({
      is: 'root',
      rows: [[{is: 'item', type: 'steel', amount: 5, showDigit: true}]],
    });
  });

  it('rejects unsupported card code', () => {
    const draft = newCardDraft();
    draft.cost = 101;
    expect(() => parseCardDraft(JSON.stringify(draft))).to.throw('invalid or unsupported');
    expect(() => parseCardDraft('{')).to.throw();
  });
});
