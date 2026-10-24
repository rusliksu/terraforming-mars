import {flushPromises, mount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import {reactive} from 'vue';
import LogPanel from '@/client/wrybit/visuals/logpanel/LogPanel.vue';
import LogMessageComponent from '@/client/wrybit/visuals/logpanel/LogMessageComponent.vue';
import {appendedLogMessages} from '@/client/wrybit/visuals/logpanel/logStream';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageType} from '@/common/logs/LogMessageType';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {CardName} from '@/common/cards/CardName';
import {fakeGameModel, fakePublicPlayerModel, fakeViewModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';

function played(color: 'red' | 'blue', card: CardName): LogMessage {
  return new LogMessage(LogMessageType.DEFAULT, '${0} played ${1}', [
    {type: LogMessageDataType.PLAYER, value: color}, {type: LogMessageDataType.CARD, value: card},
  ]);
}

describe('Wrybit log with our mutable history and access protocol', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('reloads past generations after undo and retains search, player filters and canceled styling', async () => {
    const red = fakePublicPlayerModel({id: 'p-log-red', color: 'red', name: 'Red'});
    const blue = fakePublicPlayerModel({id: 'p-log-blue', color: 'blue', name: 'Blue'});
    const asteroid = played('red', CardName.ASTEROID);
    const birds = played('blue', CardName.BIRDS);
    const fetchLogs = vi.fn().mockImplementation((url: string) => Promise.resolve({ok: true,
      json: async () => url.includes('generation=1') ? [asteroid] : [birds]}));
    vi.stubGlobal('fetch', fetchLogs);
    const viewModel = fakeViewModel({id: 'p-log-undo', players: [red, blue], thisPlayer: red,
      game: fakeGameModel({generation: 2, gameAge: 50})});
    const wrapper = mount(LogPanel, {...globalConfig, props: {viewModel}});
    try {
      await flushPromises();
      expect(fetchLogs.mock.calls.map(([url]) => url)).deep.eq([
        'api/game/logs?id=p-log-undo&generation=1&gameAge=50', 'api/game/logs?id=p-log-undo&generation=2&gameAge=50',
      ]);
      for (const [, options] of fetchLogs.mock.calls) {
        expect(options.cache).eq('no-store');
      }
      expect(wrapper.findAllComponents(LogMessageComponent)).length(2);
      await wrapper.get('input[type="search"]').setValue('Asteroid');
      expect(wrapper.findAllComponents(LogMessageComponent)).length(1);
      await wrapper.get('input[type="search"]').setValue('');
      await wrapper.get('.log-player-filter.player_bg_color_red').trigger('click');
      expect(wrapper.findAllComponents(LogMessageComponent)).length(1);
      fetchLogs.mockClear();
      const canceled = {...asteroid, canceled: true};
      fetchLogs.mockImplementation((url: string) => Promise.resolve({ok: true,
        json: async () => url.includes('generation=1') ? [canceled] : [birds]}));
      await wrapper.setProps({viewModel: {...viewModel, game: {...viewModel.game, gameAge: 51}}});
      await flushPromises();
      expect(fetchLogs.mock.calls).length(2);
      expect(wrapper.find('.log-message--canceled').exists()).is.true;
      expect(wrapper.findAllComponents(LogMessageComponent)).length(1);
      expect(appendedLogMessages([{generation: 1, messages: [asteroid]}], [{generation: 1, messages: [canceled, birds]}])).deep.eq([]);
      const current = reactive({...viewModel, game: {...viewModel.game, gameAge: 51}});
      await wrapper.setProps({viewModel: current});
      await flushPromises();
      fetchLogs.mockClear();
      current.game.gameAge = 52;
      await wrapper.vm.$nextTick();
      await flushPromises();
      expect(fetchLogs.mock.calls).length(2);
      fetchLogs.mockClear();
      await wrapper.setProps({viewModel: {...current, runId: 'same-log-revision'}});
      await flushPromises();
      expect(fetchLogs.mock.calls).length(0);
    } finally {
      wrapper.unmount();
    }
  });

  it('owns requests per panel and ignores late responses after viewer change and unmount', async () => {
    const pending: Array<{url: string; signal: AbortSignal; resolve: (response: unknown) => void}> = [];
    vi.stubGlobal('fetch', (url: string, options: {signal: AbortSignal}) => new Promise((resolve) => {
      pending.push({url, signal: options.signal as AbortSignal, resolve});
    }));
    const vm = fakeViewModel({id: 'p-log-first'});
    const first = mount(LogPanel, {...globalConfig, props: {viewModel: vm}});
    const second = mount(LogPanel, {...globalConfig, props: {viewModel: fakeViewModel({id: 's-log-second'})}});
    try {
      expect(pending[0].signal.aborted).is.false;
      expect(pending[1].signal.aborted).is.false;
      await first.setProps({viewModel: {...vm, id: 'p-log-third'}});
      expect(pending[0].signal.aborted).is.true;
      const finish = (index: number, card: CardName) => pending[index].resolve({ok: true, json: async () => [played('red', card)]});
      finish(2, CardName.ANTS);
      finish(1, CardName.ASTEROID);
      await flushPromises();
      finish(0, CardName.BIRDS);
      await flushPromises();
      expect(first.text()).contains('Ants');
      expect(first.text()).not.contains('Birds');
      expect(second.text()).contains('Asteroid');
      await first.setProps({viewModel: {...vm, id: 'p-log-unmounted'}});
      first.unmount();
      expect(pending[3].signal.aborted).is.true;
      finish(3, CardName.BIRDS);
      await flushPromises();
      expect(second.text()).contains('Asteroid');
    } finally {
      first.unmount(); second.unmount();
    }
  });

  it('keeps our infrastructure pill and canceled action class', () => {
    const wrapper = mount(LogMessageComponent, {...globalConfig, props: {
      message: {...played('red', CardName.PLANETARY_OUTPOST), canceled: true}, viewModel: fakeViewModel(),
    }});
    try {
      expect(wrapper.find('.background-color-infrastructure').exists()).is.true;
      expect(wrapper.classes()).include('log-message--canceled');
      expect(wrapper.classes()).include('log-line--red');
    } finally {
      wrapper.unmount();
    }
  });
});
