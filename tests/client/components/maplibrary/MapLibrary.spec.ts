import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import MapLibrary from '@/client/components/maplibrary/MapLibrary.vue';
import {MapLibraryEntry} from '@/common/boards/MapLibraryEntry';
import {blankCustomBoard} from '@/common/boards/CustomBoardDefinition';
import {encodeCustomBoard} from '@/common/boards/customBoardCodec';

function entry(overrides: Partial<MapLibraryEntry>): MapLibraryEntry {
  return {
    id: 'm1',
    code: encodeCustomBoard(blankCustomBoard(9, 'Map')),
    description: '',
    submittedBy: '',
    origin: 'fanmade',
    status: 'submitted',
    createdAt: 1000,
    ...overrides,
  };
}

describe('MapLibrary', () => {
  let originalFetch: typeof global.fetch;
  const entries: Array<MapLibraryEntry> = [
    entry({id: 'm-official', origin: 'official', status: 'approved', code: encodeCustomBoard(blankCustomBoard(9, 'Official Map'))}),
    entry({id: 'm-submitted', origin: 'fanmade', status: 'submitted', code: encodeCustomBoard(blankCustomBoard(9, 'Submitted Map'))}),
    entry({id: 'm-approved', origin: 'fanmade', status: 'approved', code: encodeCustomBoard(blankCustomBoard(9, 'Approved Map'))}),
  ];

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = (() => Promise.resolve({ok: true, json: () => Promise.resolve(entries)} as Response)) as typeof fetch;
    history.pushState({}, '', '/map-library');
  });

  afterEach(() => {
    global.fetch = originalFetch;
    history.pushState({}, '', '/');
    try {
      window.localStorage?.removeItem('mapLibraryLayout');
    } catch (e) { /* ignore */ }
  });

  async function mountReady() {
    const wrapper = mount(MapLibrary, {...globalConfig});
    await new Promise((resolve) => setTimeout(resolve, 0));
    await wrapper.vm.$nextTick();
    return wrapper;
  }

  it('lists every fetched entry by default', async () => {
    const wrapper = await mountReady();
    expect(wrapper.text()).to.contain('Official Map');
    expect(wrapper.text()).to.contain('Submitted Map');
    expect(wrapper.text()).to.contain('Approved Map');
  });

  it('unchecking Fan-made hides both submitted and approved fanmade rows, keeps official', async () => {
    const wrapper = await mountReady();
    const fanmadeCheckbox = wrapper.findAll('input[type=checkbox]')[1];
    await fanmadeCheckbox.setValue(false);
    expect(wrapper.text()).to.contain('Official Map');
    expect(wrapper.text()).to.not.contain('Submitted Map');
    expect(wrapper.text()).to.not.contain('Approved Map');
  });

  it('unchecking Official hides only the official row', async () => {
    const wrapper = await mountReady();
    const officialCheckbox = wrapper.findAll('input[type=checkbox]')[0];
    await officialCheckbox.setValue(false);
    expect(wrapper.text()).to.not.contain('Official Map');
    expect(wrapper.text()).to.contain('Submitted Map');
    expect(wrapper.text()).to.contain('Approved Map');
  });

  // Note: the "Approved" status-filter label always renders regardless of admin state and
  // contains "Approve" as a substring, so these assertions look for the exact button text.
  function hasApproveButton(wrapper: {findAll: (s: string) => Array<{text(): string}>}): boolean {
    return wrapper.findAll('button').some((b) => b.text() === 'Approve');
  }

  it('hides admin buttons without a serverId in the URL', async () => {
    const wrapper = await mountReady();
    expect(hasApproveButton(wrapper)).is.false;
  });

  it('shows admin buttons with a serverId in the URL', async () => {
    history.pushState({}, '', '/map-library?serverId=abc');
    const wrapper = await mountReady();
    expect(hasApproveButton(wrapper)).is.true;
  });

  it('defaults to Oldest first, and Newest reverses the order', async () => {
    global.fetch = (() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve([
        entry({id: 'm-old', createdAt: 1, code: encodeCustomBoard(blankCustomBoard(9, 'Old Map'))}),
        entry({id: 'm-mid', createdAt: 2, code: encodeCustomBoard(blankCustomBoard(9, 'Mid Map'))}),
        entry({id: 'm-new', createdAt: 3, code: encodeCustomBoard(blankCustomBoard(9, 'New Map'))}),
      ]),
    } as Response)) as typeof fetch;
    const wrapper = await mountReady();

    expect((wrapper.find('select').element as HTMLSelectElement).value).eq('oldest');
    expect(wrapper.findAll('.map-card-title').map((t) => t.text())).deep.eq(['Old Map', 'Mid Map', 'New Map']);

    await wrapper.find('select').setValue('newest');
    expect(wrapper.findAll('.map-card-title').map((t) => t.text())).deep.eq(['New Map', 'Mid Map', 'Old Map']);
  });

  it('opens the submit form and prepends a newly submitted entry', async () => {
    const wrapper = await mountReady();
    await wrapper.find('.map-library-toolbar button.btn').trigger('click');
    expect(wrapper.findComponent({name: 'MapSubmitForm'}).exists()).is.true;

    const newEntry = entry({id: 'm-new', code: encodeCustomBoard(blankCustomBoard(9, 'Brand New Map'))});
    wrapper.findComponent({name: 'MapSubmitForm'}).vm.$emit('submitted', newEntry);
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).to.contain('Brand New Map');
    expect(wrapper.findComponent({name: 'MapSubmitForm'}).exists()).is.false;
  });

  it('defaults to a single-column List layout with larger thumbnails', async () => {
    const wrapper = await mountReady();
    expect(wrapper.find('.map-library-grid').classes()).to.include('map-library-grid--list');
    const thumb = wrapper.find('.map-thumbnail');
    expect((thumb.element as HTMLElement).style.width).eq('720px');
  });

  it('switching to Grid gives a multi-column layout with normal-size thumbnails', async () => {
    const wrapper = await mountReady();
    const gridRadio = wrapper.findAll('input[type=radio]').find((r) => (r.element as HTMLInputElement).value === 'grid')!;
    await gridRadio.setValue(true);

    expect(wrapper.find('.map-library-grid').classes()).to.not.include('map-library-grid--list');
    const thumb = wrapper.find('.map-thumbnail');
    expect((thumb.element as HTMLElement).style.width).eq('500px');
  });

  it('remembers the chosen layout across mounts (localStorage)', async () => {
    const wrapper = await mountReady();
    const gridRadio = wrapper.findAll('input[type=radio]').find((r) => (r.element as HTMLInputElement).value === 'grid')!;
    await gridRadio.setValue(true);
    expect(window.localStorage.getItem('mapLibraryLayout')).eq('grid');

    const secondWrapper = await mountReady();
    expect(secondWrapper.find('.map-library-grid').classes()).to.not.include('map-library-grid--list');
  });
});
