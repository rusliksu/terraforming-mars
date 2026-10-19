import {expect} from 'chai';
import {
  CustomCardCodecError,
  decodeCustomCard,
  encodeCustomCard,
  validateCustomCard,
} from '../../../src/common/cards/customCardCodec';
import {blankCustomCard} from '../../../src/common/cards/CustomCardDefinition';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';
import {CardRenderItemType} from '../../../src/common/cards/render/CardRenderItemType';
import {ICardRenderItem} from '../../../src/common/cards/render/Types';

function steelIconRow(): {is: 'root', rows: Array<Array<ICardRenderItem>>} {
  return {is: 'root', rows: [[{is: 'item', type: CardRenderItemType.STEEL, amount: 5}]]};
}

describe('customCardCodec', () => {
  it('round-trips a blank card', () => {
    const def = blankCustomCard('Test Card');
    const decoded = decodeCustomCard(encodeCustomCard(def));
    expect(decoded).to.deep.eq(def);
  });

  it('round-trips a fully populated card', () => {
    const def = blankCustomCard('Full Card');
    def.type = CardType.ACTIVE;
    def.tags = [Tag.SCIENCE, Tag.BUILDING];
    def.compatibility = ['venus', 'moon'];
    def.cost = 12;
    def.victoryPoints = 2;
    def.requirements = [{oceans: 3}];
    def.description = 'Does a thing.';
    def.behavior = {stock: {steel: 5}};
    def.renderData = steelIconRow();

    const decoded = decodeCustomCard(encodeCustomCard(def));
    expect(decoded).to.deep.eq(def);
  });

  it('rejects a bad prefix', () => {
    expect(() => decodeCustomCard('NOPE12345')).to.throw(CustomCardCodecError, /must start with TMC1/);
  });

  it('rejects invalid base64url characters', () => {
    expect(() => decodeCustomCard('TMC1!!!!')).to.throw(CustomCardCodecError);
  });

  it('rejects a code missing required fields', () => {
    const bogus = encodeCustomCard({cardName: 'x'} as any);
    expect(() => decodeCustomCard(bogus)).to.throw(CustomCardCodecError, /missing required fields/);
  });

  it('validate flags a card with no name, no icons, no effect, and no compatibility', () => {
    const def = blankCustomCard('');
    const warnings = validateCustomCard(def);
    expect(warnings).to.have.length(4);
  });

  it('validate is silent for a well-formed card', () => {
    const def = blankCustomCard('Fine Card');
    def.compatibility = ['venus'];
    def.effectDescription = 'gain 5 steel';
    def.renderData = steelIconRow();
    expect(validateCustomCard(def)).to.deep.eq([]);
  });
});
