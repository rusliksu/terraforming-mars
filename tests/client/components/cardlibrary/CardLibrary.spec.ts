import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import CardLibrary from '@/client/components/cardlibrary/CardLibrary.vue';
import {CustomCardLibraryEntry, CustomCardEntryId} from '@/common/cards/CustomCardLibraryEntry';
import {blankCustomCard} from '@/common/cards/CustomCardDefinition';
import {encodeCustomCard} from '@/common/cards/customCardCodec';

function entry(overrides: Partial<CustomCardLibraryEntry> & {cardName?: string} = {}): CustomCardLibraryEntry {
  const {cardName, ...rest} = overrides;
  const definition = blankCustomCard(cardName ?? 'Blank Card');
  return {
    id: 'c1' as CustomCardEntryId,
    definition,
    shareCode: encodeCustomCard(definition),
    submittedBy: '',
    status: 'submitted',
    createdAt: 1000,
    ...rest,
  };
}

describe('CardLibrary', () => {
  let originalFetch: typeof global.fetch;
  const entries: Array<CustomCardLibraryEntry> = [
    entry({id: 'c-submitted' as CustomCardEntryId, cardName: 'Submitted Card', status: 'submitted'}),
    entry({id: 'c-approved' as CustomCardEntryId, cardName: 'Approved Card', status: 'approved'}),
  ];

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = (() => Promise.resolve({ok: true, json: () => Promise.resolve(entries)} as Response)) as typeof fetch;
    history.pushState({}, '', '/card-library');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    history.pushState({}, '', '/');
  });

  async function mountReady() {
    const wrapper = mount(CardLibrary, {...globalConfig});
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();
    return wrapper;
  }

  it('lists every fetched entry by default', async () => {
    const wrapper = await mountReady();
    expect(wrapper.text()).to.contain('Submitted Card');
    expect(wrapper.text()).to.contain('Approved Card');
  });

  it('unchecking Submitted hides only the submitted row', async () => {
    const wrapper = await mountReady();
    const submittedCheckbox = wrapper.findAll('input[type=checkbox]')[0];
    await submittedCheckbox.setValue(false);
    expect(wrapper.text()).to.not.contain('Submitted Card');
    expect(wrapper.text()).to.contain('Approved Card');
  });

  function hasApproveButton(wrapper: {findAll: (s: string) => Array<{text(): string}>}): boolean {
    return wrapper.findAll('button').some((b) => b.text() === 'Approve');
  }

  it('hides admin buttons without a serverId in the URL', async () => {
    const wrapper = await mountReady();
    expect(hasApproveButton(wrapper)).is.false;
  });

  it('shows admin buttons with a serverId in the URL', async () => {
    history.pushState({}, '', '/card-library?serverId=abc');
    const wrapper = await mountReady();
    expect(hasApproveButton(wrapper)).is.true;
  });

  it('links to the games overview and map library admin pages, carrying serverId along', async () => {
    history.pushState({}, '', '/card-library?serverId=abc');
    const wrapper = await mountReady();
    const links = wrapper.findAll('a').map((a) => a.attributes('href'));
    expect(links).to.include('games-overview?serverId=abc');
    expect(links).to.include('map-library?serverId=abc');
  });

  it('defaults to Oldest first, and Newest reverses the order', async () => {
    global.fetch = (() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([
        entry({id: 'c-old' as CustomCardEntryId, cardName: 'Old Card', createdAt: 1}),
        entry({id: 'c-mid' as CustomCardEntryId, cardName: 'Mid Card', createdAt: 2}),
        entry({id: 'c-new' as CustomCardEntryId, cardName: 'New Card', createdAt: 3}),
      ]),
    } as Response)) as typeof fetch;
    const wrapper = await mountReady();

    expect((wrapper.find('select').element as HTMLSelectElement).value).eq('oldest');

    await wrapper.find('select').setValue('newest');
    const text = wrapper.text();
    expect(text.indexOf('New Card')).to.be.lessThan(text.indexOf('Old Card'));
  });

  it('approving posts to the review API and moves the card to Approved', async () => {
    const approvableEntry = entry({id: 'c-submitted' as CustomCardEntryId, cardName: 'Submitted Card', status: 'submitted'});
    approvableEntry.definition.behavior = {production: {megacredits: 1}};
    let postedBody: any;
    let approved = false;
    global.fetch = ((_url: string, opts?: {method?: string, body?: string}) => {
      if (opts?.method === 'POST') {
        postedBody = JSON.parse(opts.body as string);
        approved = true;
        return Promise.resolve({ok: true, json: () => Promise.resolve({ok: true})} as Response);
      }
      const currentEntries = approved ? [{...approvableEntry, status: 'approved'}] : [approvableEntry];
      return Promise.resolve({ok: true, json: () => Promise.resolve(currentEntries)} as Response);
    }) as typeof fetch;
    history.pushState({}, '', '/card-library?serverId=abc');
    const wrapper = await mountReady();

    const approveButton = wrapper.findAll('button').find((b) => b.text() === 'Approve')!;
    expect((approveButton.element as HTMLButtonElement).disabled).is.false;
    await approveButton.trigger('click');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();

    expect(postedBody).to.deep.eq({id: 'c-submitted', action: 'approve'});
    expect(wrapper.text()).to.contain('approved');
  });
});
