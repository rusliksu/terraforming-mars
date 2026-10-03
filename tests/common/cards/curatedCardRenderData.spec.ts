import {expect} from 'chai';
import {isCuratedRenderData} from '../../../src/common/cards/curatedCardRenderData';
import {CardRenderItemType} from '../../../src/common/cards/render/CardRenderItemType';
import {CardRenderSymbolType} from '../../../src/common/cards/render/CardRenderSymbolType';
import {Tag} from '../../../src/common/cards/Tag';
import {CardResource} from '../../../src/common/CardResource';
import {TileType} from '../../../src/common/TileType';
import {Size} from '../../../src/common/cards/render/Size';

describe('curatedCardRenderData', () => {
  it('accepts an empty root', () => {
    expect(isCuratedRenderData({is: 'root', rows: []})).is.true;
  });

  it('accepts a curated item', () => {
    const renderData = {is: 'root', rows: [[{is: 'item', type: CardRenderItemType.STEEL, amount: 2, size: Size.MEDIUM}]]};
    expect(isCuratedRenderData(renderData)).is.true;
  });

  it('accepts a TAG item with a tag field', () => {
    const renderData = {is: 'root', rows: [[{is: 'item', type: CardRenderItemType.TAG, amount: 1, tag: Tag.SPACE}]]};
    expect(isCuratedRenderData(renderData)).is.true;
  });

  it('rejects a TAG item missing its tag field', () => {
    const renderData = {is: 'root', rows: [[{is: 'item', type: CardRenderItemType.TAG, amount: 1}]]};
    expect(isCuratedRenderData(renderData)).is.false;
  });

  it('accepts a RESOURCE item with a resource field', () => {
    const renderData = {is: 'root', rows: [[{is: 'item', type: CardRenderItemType.RESOURCE, amount: 1, resource: CardResource.MICROBE}]]};
    expect(isCuratedRenderData(renderData)).is.true;
  });

  it('rejects a resource field on a non-RESOURCE item', () => {
    const renderData = {is: 'root', rows: [[{is: 'item', type: CardRenderItemType.STEEL, amount: 1, resource: CardResource.MICROBE}]]};
    expect(isCuratedRenderData(renderData)).is.false;
  });

  it('accepts a curated symbol', () => {
    const renderData = {is: 'root', rows: [[{is: 'symbol', type: CardRenderSymbolType.ARROW}]]};
    expect(isCuratedRenderData(renderData)).is.true;
  });

  it('accepts a symbol with isIcon:true (an arrow rendered as a graphic, not "->" text)', () => {
    const renderData = {is: 'root', rows: [[{is: 'symbol', type: CardRenderSymbolType.ARROW, size: Size.SMALL, isIcon: true}]]};
    expect(isCuratedRenderData(renderData)).is.true;
  });

  it('accepts a symbol with isSuperscript:true (e.g. a raised bracket)', () => {
    const renderData = {is: 'root', rows: [[{is: 'symbol', type: CardRenderSymbolType.BRACKET_OPEN, isSuperscript: true}]]};
    expect(isCuratedRenderData(renderData)).is.true;
  });

  it('rejects isIcon set to a non-true value', () => {
    const renderData = {is: 'root', rows: [[{is: 'symbol', type: CardRenderSymbolType.ARROW, isIcon: false}]]};
    expect(isCuratedRenderData(renderData)).is.false;
  });

  it('accepts a curated tile', () => {
    const renderData = {is: 'root', rows: [[{is: 'tile', tile: TileType.GREENERY}]]};
    expect(isCuratedRenderData(renderData)).is.true;
  });

  it('rejects an uncurated tile type', () => {
    const renderData = {is: 'root', rows: [[{is: 'tile', tile: TileType.NUCLEAR_ZONE}]]};
    expect(isCuratedRenderData(renderData)).is.false;
  });

  it('accepts a short plain-text row item', () => {
    expect(isCuratedRenderData({is: 'root', rows: [['max 4']]})).is.true;
  });

  it('rejects an overlong plain-text row item', () => {
    expect(isCuratedRenderData({is: 'root', rows: [['x'.repeat(25)]]})).is.false;
  });

  it('rejects an item carrying a `text` field (v-html injection vector)', () => {
    const renderData = {is: 'root', rows: [[{is: 'item', type: CardRenderItemType.STEEL, amount: 1, text: '<img src=x onerror=alert(1)>'}]]};
    expect(isCuratedRenderData(renderData)).is.false;
  });

  it('rejects an item carrying an `innerText` field (v-html injection vector)', () => {
    const renderData = {is: 'root', rows: [[{is: 'item', type: CardRenderItemType.MEGACREDITS, amount: 1, innerText: '<script>alert(1)</script>'}]]};
    expect(isCuratedRenderData(renderData)).is.false;
  });

  it('rejects an uncurated item type', () => {
    const renderData = {is: 'root', rows: [[{is: 'item', type: CardRenderItemType.SELF_REPLICATING, amount: 1}]]};
    expect(isCuratedRenderData(renderData)).is.false;
  });

  it('rejects a nested production-box (not a flat tree)', () => {
    const renderData = {is: 'root', rows: [[{is: 'production-box', rows: []}]]};
    expect(isCuratedRenderData(renderData)).is.false;
  });

  it('rejects an out-of-range amount', () => {
    const renderData = {is: 'root', rows: [[{is: 'item', type: CardRenderItemType.STEEL, amount: 21}]]};
    expect(isCuratedRenderData(renderData)).is.false;
    const negative = {is: 'root', rows: [[{is: 'item', type: CardRenderItemType.STEEL, amount: -1}]]};
    expect(isCuratedRenderData(negative)).is.false;
  });

  it('rejects too many rows', () => {
    const rows = [[], [], [], [], []]; // MAX_CUSTOM_CARD_RENDER_ROWS is 4
    expect(isCuratedRenderData({is: 'root', rows})).is.false;
  });

  it('rejects too many items in one row', () => {
    const row = new Array(9).fill('x'); // MAX_CUSTOM_CARD_RENDER_ITEMS_PER_ROW is 8
    expect(isCuratedRenderData({is: 'root', rows: [row]})).is.false;
  });

  it('rejects a non-root object', () => {
    expect(isCuratedRenderData({is: 'effect', rows: []})).is.false;
    expect(isCuratedRenderData(null)).is.false;
    expect(isCuratedRenderData('nope')).is.false;
  });
});
