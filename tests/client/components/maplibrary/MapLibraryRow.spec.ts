import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import MapLibraryRow from '@/client/components/maplibrary/MapLibraryRow.vue';
import {MapLibraryEntry} from '@/common/boards/MapLibraryEntry';
import {blankCustomBoard} from '@/common/boards/CustomBoardDefinition';
import {encodeCustomBoard} from '@/common/boards/customBoardCodec';
import {OFFICIAL_MAP_LIBRARY_BOARDS, FAN_MAP_LIBRARY_BOARDS, officialMapLibraryId} from '@/common/boards/officialMapLibrary';
import {BoardName} from '@/common/boards/BoardName';

function fanmadeEntry(overrides: Partial<MapLibraryEntry> = {}): MapLibraryEntry {
  return {
    id: 'm1',
    code: encodeCustomBoard(blankCustomBoard(9, 'A Fan Map')),
    description: '',
    submittedBy: '',
    origin: 'fanmade',
    status: 'submitted',
    createdAt: 1000,
    ...overrides,
  };
}

// jsdom refuses to actually navigate (logs "Not implemented: navigation" and leaves
// window.location.href unchanged), so stub `location` with a plain object that just
// records what it was set to -- exactly what the two "play" tests below need to observe.
function stubLocation(): {href: string} {
  const original = window.location;
  const stub = {href: original.href};
  Object.defineProperty(window, 'location', {configurable: true, value: stub});
  return stub;
}

describe('MapLibraryRow', () => {
  let originalLocation: Location;

  beforeEach(() => {
    originalLocation = window.location;
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {configurable: true, value: originalLocation});
    try {
      window.localStorage?.removeItem('customBoardCode');
      window.localStorage?.removeItem('mapEditorLoadCode');
    } catch (e) { /* ignore */ }
  });

  it('shows the decoded name and description', () => {
    const wrapper = mount(MapLibraryRow, {...globalConfig, props: {entry: fanmadeEntry({description: 'a nice map'})}});
    expect(wrapper.text()).to.contain('A Fan Map');
    expect(wrapper.text()).to.contain('a nice map');
  });

  it('falls back gracefully when the code cannot be decoded', () => {
    const wrapper = mount(MapLibraryRow, {...globalConfig, props: {entry: fanmadeEntry({code: 'not-a-real-code'})}});
    expect(wrapper.find('.map-thumbnail--error').exists()).is.true;
  });

  it('hides admin buttons when not an admin', () => {
    const wrapper = mount(MapLibraryRow, {...globalConfig, props: {entry: fanmadeEntry(), isAdmin: false}});
    expect(wrapper.text()).to.not.contain('Approve');
    expect(wrapper.text()).to.not.contain('Delete');
  });

  it('shows Approve only for a submitted fanmade map when admin', () => {
    const submitted = mount(MapLibraryRow, {...globalConfig, props: {entry: fanmadeEntry({status: 'submitted'}), isAdmin: true}});
    expect(submitted.text()).to.contain('Approve');
    expect(submitted.text()).to.contain('Delete');

    const approved = mount(MapLibraryRow, {...globalConfig, props: {entry: fanmadeEntry({status: 'approved'}), isAdmin: true}});
    expect(approved.text()).to.not.contain('Approve');
    expect(approved.text()).to.contain('Delete');
  });

  it('emits approve/delete with the entry id', async () => {
    const wrapper = mount(MapLibraryRow, {...globalConfig, props: {entry: fanmadeEntry({id: 'm42'}), isAdmin: true}});
    const findButton = (text: string) => wrapper.findAll('button').find((b) => b.text() === text)!;
    await findButton('Approve').trigger('click');
    expect(wrapper.emitted('approve')).deep.eq([['m42']]);

    await findButton('Delete').trigger('click');
    expect(wrapper.emitted('delete')).deep.eq([['m42']]);
  });

  it('never shows Delete (or Approve) for an official map, even when admin', () => {
    const wrapper = mount(MapLibraryRow, {...globalConfig, props: {entry: fanmadeEntry({origin: 'official', status: 'approved'}), isAdmin: true}});
    expect(wrapper.text()).to.not.contain('Delete');
    expect(wrapper.text()).to.not.contain('Approve');
  });

  it('copies the map code to the clipboard', async () => {
    let copiedText: string | undefined;
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {writeText: (text: string) => {
        copiedText = text; return Promise.resolve();
      }},
    });

    const entry = fanmadeEntry();
    const wrapper = mount(MapLibraryRow, {...globalConfig, props: {entry}});
    const copyButton = wrapper.findAll('button').find((b) => b.text() === 'Copy code')!;
    await copyButton.trigger('click');
    await wrapper.vm.$nextTick();

    expect(copiedText).eq(entry.code);
    expect(copyButton.text()).eq('Copied!');
  });

  it('playing a fanmade map stores its code and navigates to customBoard=1', async () => {
    const location = stubLocation();
    const entry = fanmadeEntry();
    const wrapper = mount(MapLibraryRow, {...globalConfig, props: {entry}});
    await wrapper.find('button.btn-primary').trigger('click');
    expect(window.localStorage.getItem('customBoardCode')).eq(entry.code);
    expect(location.href).to.contain('new-game?customBoard=1');
  });

  it('playing an official map navigates with ?board= and does not touch localStorage', async () => {
    const location = stubLocation();
    const {boardName} = OFFICIAL_MAP_LIBRARY_BOARDS[0];
    const officialEntry: MapLibraryEntry = fanmadeEntry({
      id: officialMapLibraryId(boardName),
      code: OFFICIAL_MAP_LIBRARY_BOARDS[0].code,
      origin: 'official',
      status: 'approved',
    });
    window.localStorage.setItem('customBoardCode', 'sentinel-should-not-change');
    const wrapper = mount(MapLibraryRow, {...globalConfig, props: {entry: officialEntry}});
    await wrapper.find('button.btn-primary').trigger('click');
    expect(location.href).to.contain(`new-game?board=${encodeURIComponent(boardName)}`);
    expect(location.href).to.not.contain('customBoard=1');
    expect(window.localStorage.getItem('customBoardCode')).eq('sentinel-should-not-change');
    expect(boardName).eq(BoardName.THARSIS);
  });

  it('playing a fan-made-but-built-in map (e.g. Hollandia) still navigates with ?board=, not customBoard=1', async () => {
    // A built-in fan board has its own bespoke board class, unlike a genuine community
    // submission -- its "origin" tag is cosmetic labeling only, so play() must still deep-link
    // to the real BoardName for correct gameplay, exactly like an official board does.
    const location = stubLocation();
    const {boardName, code} = FAN_MAP_LIBRARY_BOARDS[0];
    const fanBuiltInEntry: MapLibraryEntry = fanmadeEntry({
      id: officialMapLibraryId(boardName),
      code,
      origin: 'fanmade',
      status: 'approved',
    });
    window.localStorage.setItem('customBoardCode', 'sentinel-should-not-change');
    const wrapper = mount(MapLibraryRow, {...globalConfig, props: {entry: fanBuiltInEntry}});
    await wrapper.find('button.btn-primary').trigger('click');
    expect(location.href).to.contain(`new-game?board=${encodeURIComponent(boardName)}`);
    expect(location.href).to.not.contain('customBoard=1');
    expect(window.localStorage.getItem('customBoardCode')).eq('sentinel-should-not-change');
  });

  it('hides all action buttons in previewOnly mode, admin or not', () => {
    const wrapper = mount(MapLibraryRow, {...globalConfig, props: {entry: fanmadeEntry(), isAdmin: true, previewOnly: true}});
    expect(wrapper.find('.map-card-actions').exists()).is.false;
    expect(wrapper.text()).to.not.contain('Play this map');
    expect(wrapper.text()).to.not.contain('Open in editor');
    expect(wrapper.text()).to.not.contain('Copy code');
    expect(wrapper.text()).to.not.contain('Approve');
    expect(wrapper.text()).to.not.contain('Delete');
  });

  it('opening any map in the editor stashes its code and navigates to map-editor?loadCode=1, regardless of origin', async () => {
    const location = stubLocation();
    const entry = fanmadeEntry({code: encodeCustomBoard(blankCustomBoard(9, 'Open Me'))});
    const wrapper = mount(MapLibraryRow, {...globalConfig, props: {entry}});
    const openButton = wrapper.findAll('button').find((b) => b.text() === 'Open in editor')!;
    await openButton.trigger('click');
    expect(window.localStorage.getItem('mapEditorLoadCode')).eq(entry.code);
    expect(location.href).to.contain('map-editor?loadCode=1');
  });
});
