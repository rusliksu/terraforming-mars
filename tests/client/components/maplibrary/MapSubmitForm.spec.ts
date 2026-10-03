import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import MapSubmitForm from '@/client/components/maplibrary/MapSubmitForm.vue';
import {blankCustomBoard} from '@/common/boards/CustomBoardDefinition';
import {encodeCustomBoard} from '@/common/boards/customBoardCodec';
import {MapLibraryEntry} from '@/common/boards/MapLibraryEntry';

describe('MapSubmitForm', () => {
  let originalFetch: typeof global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });
  beforeEach(() => {
    originalFetch = global.fetch;
  });

  it('disables submit and shows an error for a garbage code', async () => {
    const wrapper = mount(MapSubmitForm, {...globalConfig});
    await wrapper.find('textarea.map-submit-code').setValue('not a real code');
    expect(wrapper.find('.map-submit-error').exists()).is.true;
    expect((wrapper.find('button.btn-primary').element as HTMLButtonElement).disabled).is.true;
  });

  it('enables submit and previews the decoded name for a valid code', async () => {
    const wrapper = mount(MapSubmitForm, {...globalConfig});
    const code = encodeCustomBoard(blankCustomBoard(9, 'Great Map'));
    await wrapper.find('textarea.map-submit-code').setValue(code);
    expect(wrapper.find('.map-submit-error').exists()).is.false;
    expect(wrapper.text()).to.contain('Great Map');
    expect((wrapper.find('button.btn-primary').element as HTMLButtonElement).disabled).is.false;
  });

  it('posts the code/description/submittedBy and emits the created entry', async () => {
    const code = encodeCustomBoard(blankCustomBoard(9, 'Great Map'));
    const createdEntry: MapLibraryEntry = {
      id: 'm1', code, description: 'desc', submittedBy: 'me',
      origin: 'fanmade', status: 'submitted', createdAt: 1,
    };
    let sentBody: any;
    global.fetch = ((_url: string, init: any) => {
      sentBody = JSON.parse(init.body);
      return Promise.resolve({ok: true, status: 200, json: () => Promise.resolve({entry: createdEntry})} as Response);
    }) as typeof fetch;

    const wrapper = mount(MapSubmitForm, {...globalConfig});
    await wrapper.find('textarea.map-submit-code').setValue(code);
    await wrapper.find('textarea.map-submit-description').setValue('desc');
    await wrapper.find('input[type=text]').setValue('me');
    await wrapper.find('button.btn-primary').trigger('click');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(sentBody).deep.eq({code, description: 'desc', submittedBy: 'me'});
    expect(wrapper.emitted('submitted')).deep.eq([[createdEntry]]);
  });

  it('shows a clear message when rate-limited', async () => {
    global.fetch = (() => Promise.resolve({ok: false, status: 429} as Response)) as typeof fetch;
    const wrapper = mount(MapSubmitForm, {...globalConfig});
    const code = encodeCustomBoard(blankCustomBoard(9, 'Great Map'));
    await wrapper.find('textarea.map-submit-code').setValue(code);
    await wrapper.find('button.btn-primary').trigger('click');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(wrapper.text()).to.contain('too quickly');
  });
});
