import {mount, shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import CardMaker from '@/client/components/cardmaker/CardMaker.vue';
import {decodeCustomCard, encodeCustomCard} from '@/common/cards/customCardCodec';
import {blankCustomCard} from '@/common/cards/CustomCardDefinition';
import {CardType} from '@/common/cards/CardType';
import {Tag} from '@/common/cards/Tag';
import {CardRenderItemType} from '@/common/cards/render/CardRenderItemType';
import {CardRenderSymbolType} from '@/common/cards/render/CardRenderSymbolType';
import {ICardRenderItem} from '@/common/cards/render/Types';
import {CustomCardLibraryEntry} from '@/common/cards/CustomCardLibraryEntry';

describe('CardMaker', () => {
  let originalFetch: typeof global.fetch;
  beforeEach(() => {
    originalFetch = global.fetch;
  });
  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('mounts without errors', () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    expect(wrapper.exists()).to.be.true;
  });

  it('builds a decodable code from the basic fields', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.cardName = 'My Card';
    vm.cost = 12;
    vm.tags = [Tag.SPACE];
    await wrapper.vm.$nextTick();

    const decoded = decodeCustomCard(vm.code);
    expect(decoded.cardName).eq('My Card');
    expect(decoded.cost).eq(12);
    expect(decoded.tags).deep.eq([Tag.SPACE]);
  });

  it('addTag allows the same tag more than once, up to the cap', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.addTag(Tag.SPACE);
    vm.addTag(Tag.SPACE);
    await wrapper.vm.$nextTick();
    expect(vm.tags).to.deep.eq([Tag.SPACE, Tag.SPACE]);
    expect(vm.tagCount(Tag.SPACE)).eq(2);
  });

  it('removeTag removes only one instance of a duplicated tag', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.addTag(Tag.SPACE);
    vm.addTag(Tag.SPACE);
    vm.removeTag(Tag.SPACE);
    await wrapper.vm.$nextTick();
    expect(vm.tags).to.deep.eq([Tag.SPACE]);
  });

  it('addTag stops at MAX_CUSTOM_CARD_TAGS even for a single repeated tag', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    for (let i = 0; i < 10; i++) {
      vm.addTag(Tag.SPACE);
    }
    expect(vm.tags.length).eq(vm.MAX_CUSTOM_CARD_TAGS);
  });

  it('adding the Crime tag for the first time auto-enables Underworld compatibility', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    expect(vm.compatibility).to.deep.eq([]);
    vm.addTag(Tag.CRIME);
    await wrapper.vm.$nextTick();
    expect(vm.compatibility).to.include('underworld');
  });

  it('adding the Moon tag auto-enables Moon compatibility, and Mars auto-enables Pathfinders', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.addTag(Tag.MOON);
    vm.addTag(Tag.MARS);
    await wrapper.vm.$nextTick();
    expect(vm.compatibility).to.include('moon');
    expect(vm.compatibility).to.include('pathfinders');
  });

  it('does not duplicate an auto-enabled compatibility on a second copy of the tag, and keeps it while any instance of the tag remains', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.addTag(Tag.CRIME);
    vm.addTag(Tag.CRIME);
    vm.removeTag(Tag.CRIME);
    await wrapper.vm.$nextTick();
    expect(vm.tagCount(Tag.CRIME)).eq(1);
    expect(vm.compatibility.filter((e: string) => e === 'underworld')).to.deep.eq(['underworld']);
  });

  it('removing the last instance of a tag that implied an expansion disables that compatibility again', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.addTag(Tag.CRIME);
    vm.removeTag(Tag.CRIME);
    await wrapper.vm.$nextTick();
    expect(vm.compatibility).to.not.include('underworld');
  });

  it('does not disable an unrelated, manually-picked compatibility when removing a tag', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.compatibility.push('venus');
    vm.addTag(Tag.CRIME);
    vm.removeTag(Tag.CRIME);
    await wrapper.vm.$nextTick();
    expect(vm.compatibility).to.deep.eq(['venus']);
  });

  it('adding the Venus tag auto-enables Venus compatibility', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.addTag(Tag.VENUS);
    await wrapper.vm.$nextTick();
    expect(vm.compatibility).to.include('venus');
    vm.removeTag(Tag.VENUS);
    await wrapper.vm.$nextTick();
    expect(vm.compatibility).to.not.include('venus');
  });

  it('a curated stock effect becomes part of the behavior', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.fx.useStock = true;
    vm.fx.stock.steel = 3;
    await wrapper.vm.$nextTick();
    expect(vm.definition.behavior).to.deep.eq({stock: {steel: 3}});
  });

  it('a curated global-parameter effect becomes part of the behavior', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.fx.useGlobal = true;
    vm.fx.temperature = 2;
    await wrapper.vm.$nextTick();
    expect(vm.definition.behavior).to.deep.eq({global: {temperature: 2}});
  });

  it('has no behavior when no curated effect is toggled and no free text is given', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    expect(vm.definition.behavior).is.undefined;
    expect(vm.warnings).to.include('The card has no effect and no effect description -- it cannot be approved as-is.');
  });

  it('adding a resource icon appends a curated item to renderData', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.rowDrafts[0].kind = 'item';
    vm.rowDrafts[0].itemType = CardRenderItemType.STEEL;
    vm.rowDrafts[0].amount = 4;
    vm.addItemToRow(0);
    await wrapper.vm.$nextTick();

    expect(vm.renderData.rows).to.deep.eq([[{is: 'item', type: CardRenderItemType.STEEL, amount: 4, size: 'M'}]]);
  });

  it('adding a text icon appends a plain string to renderData', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.rowDrafts[0].kind = 'text';
    vm.rowDrafts[0].text = 'max 4';
    vm.addItemToRow(0);
    await wrapper.vm.$nextTick();

    expect(vm.renderData.rows).to.deep.eq([['max 4']]);
  });

  it('an added arrow symbol renders as the graphic (isIcon:true), not the literal "->" text', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.rowDrafts[0].kind = 'symbol';
    vm.rowDrafts[0].symbolType = CardRenderSymbolType.ARROW;
    vm.addItemToRow(0);
    await wrapper.vm.$nextTick();

    expect(vm.renderData.rows[0][0]).to.deep.eq({is: 'symbol', type: CardRenderSymbolType.ARROW, size: 'M', isIcon: true});
  });

  it('an added OR symbol has no isIcon (it legitimately renders as literal "OR" text)', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.rowDrafts[0].kind = 'symbol';
    vm.rowDrafts[0].symbolType = CardRenderSymbolType.OR;
    vm.addItemToRow(0);
    await wrapper.vm.$nextTick();

    expect(vm.renderData.rows[0][0]).to.deep.eq({is: 'symbol', type: CardRenderSymbolType.OR, size: 'M'});
  });

  it('reorders icons within a row via drag and drop', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.rows[0] = [{kind: 'text', text: 'a'}, {kind: 'text', text: 'b'}, {kind: 'text', text: 'c'}];
    vm.onChipDragStart(0, 0); // drag "a"
    vm.onChipDrop(0, 2); // ...to before index 2 ("c")
    await wrapper.vm.$nextTick();

    expect(vm.rows[0].map((i: any) => i.text)).to.deep.eq(['b', 'a', 'c']);
    expect(vm.dragSource).to.be.null;
  });

  it('moves an icon into a different row via drag and drop', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.addRow(); // rowDrafts must stay in sync with rows, so grow it via the real method
    vm.rows[0] = [{kind: 'text', text: 'a'}];
    vm.rows[1] = [{kind: 'text', text: 'b'}];
    vm.onChipDragStart(0, 0); // drag "a" out of row 0
    vm.onChipDrop(1, 1); // ...append to end of row 1
    await wrapper.vm.$nextTick();

    expect(vm.rows[0]).to.deep.eq([]);
    expect(vm.rows[1].map((i: any) => i.text)).to.deep.eq(['b', 'a']);
  });

  it('drag and drop does nothing dropping into an already-full different row', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    const fullRow = new Array(vm.MAX_CUSTOM_CARD_RENDER_ITEMS_PER_ROW).fill(0).map((_, i) => ({kind: 'text', text: `x${i}`}));
    vm.addRow();
    vm.rows[0] = [{kind: 'text', text: 'a'}];
    vm.rows[1] = fullRow;
    vm.onChipDragStart(0, 0);
    vm.onChipDrop(1, 0);
    await wrapper.vm.$nextTick();

    expect(vm.rows[0].map((i: any) => i.text)).to.deep.eq(['a']);
    expect(vm.rows[1].length).eq(vm.MAX_CUSTOM_CARD_RENDER_ITEMS_PER_ROW);
  });

  it('adding a row is capped at MAX_CUSTOM_CARD_RENDER_ROWS', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    for (let i = 0; i < 10; i++) {
      vm.addRow();
    }
    expect(vm.rows.length).eq(vm.MAX_CUSTOM_CARD_RENDER_ROWS);
  });

  it('round-trips a loaded code back into the editable fields', async () => {
    const def = blankCustomCard('Loaded Card');
    def.type = CardType.ACTIVE;
    def.tags = [Tag.VENUS];
    def.cost = 15;
    def.victoryPoints = 2;
    def.behavior = {stock: {plants: 2}, drawCard: 1};
    def.renderData = {is: 'root', rows: [[{is: 'item', type: CardRenderItemType.PLANTS, amount: 2} as ICardRenderItem]]};

    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.loadInput = encodeCustomCard(def);
    vm.loadCode();
    await wrapper.vm.$nextTick();

    expect(vm.cardName).eq('Loaded Card');
    expect(vm.type).eq(CardType.ACTIVE);
    expect(vm.tags).deep.eq([Tag.VENUS]);
    expect(vm.cost).eq(15);
    expect(vm.hasVictoryPoints).is.true;
    expect(vm.victoryPointsInput).eq(2);
    expect(vm.fx.useStock).is.true;
    expect(vm.fx.stock.plants).eq(2);
    expect(vm.fx.useDrawCard).is.true;
    expect(vm.fx.drawCardCount).eq(1);
    expect(vm.definition.behavior).to.deep.eq({stock: {plants: 2}, drawCard: 1});
  });

  it('shows a load error for a garbage code', async () => {
    const wrapper = mount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.loadInput = 'not a real code';
    vm.loadCode();
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.card-maker-error').exists()).is.true;
  });

  it('shows a warning instead of crashing when loading a non-curated (admin-set) behavior', async () => {
    const def = blankCustomCard('Advanced Card');
    def.behavior = {or: {behaviors: []}} as any;
    def.effectDescription = 'An admin-authored effect.';

    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.loadInput = encodeCustomCard(def);
    vm.loadCode();
    await wrapper.vm.$nextTick();

    expect(vm.loadWarning).to.contain('advanced');
    expect(vm.definition.behavior).is.undefined;
    expect(vm.effectDescription).eq('An admin-authored effect.');
  });

  it('renders the card name in the live preview', () => {
    const wrapper = mount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.cardName = 'Preview Card';
    return wrapper.vm.$nextTick().then(() => {
      expect(wrapper.text()).to.contain('Preview Card');
    });
  });

  it('posts the definition and submittedBy, and shows the resulting entry id', async () => {
    const createdEntry: CustomCardLibraryEntry = {
      id: 'c1',
      definition: blankCustomCard('Submitted Card'),
      shareCode: 'TMC1xyz',
      submittedBy: 'me',
      status: 'submitted',
      createdAt: 1,
    };
    let sentBody: any;
    global.fetch = ((_url: string, init: any) => {
      sentBody = JSON.parse(init.body);
      return Promise.resolve({ok: true, status: 200, json: () => Promise.resolve({entry: createdEntry, warnings: []})} as Response);
    }) as typeof fetch;

    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.cardName = 'Submitted Card';
    vm.submittedBy = 'me';
    await vm.submit();

    expect(sentBody.submittedBy).eq('me');
    expect(sentBody.definition.cardName).eq('Submitted Card');
    expect(vm.submittedEntry).to.deep.eq(createdEntry);
  });

  it('shows a clear message when rate-limited', async () => {
    global.fetch = (() => Promise.resolve({ok: false, status: 429} as Response)) as typeof fetch;
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.cardName = 'x';
    await vm.submit();
    expect(vm.submitError).to.contain('too quickly');
  });

  it('newCard resets the form back to blank', async () => {
    const wrapper = shallowMount(CardMaker, {...globalConfig});
    const vm = wrapper.vm as any;
    vm.cardName = 'Something';
    vm.tags = [Tag.MARS];
    vm.rows = [[{kind: 'text', text: 'x'}]];
    await wrapper.vm.$nextTick();
    vm.newCard();
    await wrapper.vm.$nextTick();
    expect(vm.cardName).eq('');
    expect(vm.tags).deep.eq([]);
    expect(vm.rows).deep.eq([[]]);
  });
});
