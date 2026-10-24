import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import {flushPromises} from '@vue/test-utils';
import GameSetupDetail from '@/client/wrybit/visuals/GameSetupDetail.vue';
import InfoPanel from '@/client/wrybit/visuals/InfoPanel.vue';
import {EXPANSIONS, MODULE_NAMES} from '@/common/cards/GameModule';
import {fakeGameOptionsModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Wrybit game information with our options', () => {
  it('shows every enabled expansion and retains our privacy, draft, ELO and undo flags', () => {
    const gameOptions = fakeGameOptionsModel({initialDraftOneWay: true, privateHands: true, noEloGame: true, undoStepOption: true});
    for (const expansion of EXPANSIONS) {
      gameOptions.expansions[expansion] = true;
    }
    const wrapper = mount(GameSetupDetail, {...globalConfig, props: {gameOptions, playerNumber: 3, lastSoloGeneration: 14}});
    try {
      for (const expansion of EXPANSIONS) {
        expect(wrapper.text()).contains(MODULE_NAMES[expansion]);
      }
      expect(wrapper.text()).contains('10-card one-way (experimental)');
      expect(wrapper.text()).contains('private hands');
      expect(wrapper.text()).contains('no ELO');
      expect(wrapper.text()).contains('undo one step');
    } finally {
      wrapper.unmount();
    }
  });

  it('renders supplied decks and spectator link, copies on click and cleans the reset timer', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', {configurable: true, value: {writeText}});
    const wrapper = mount(InfoPanel, {...globalConfig, props: {gameOptions: fakeGameOptionsModel(), playerNumber: 2,
      lastSoloGeneration: 14, deckSize: 42, discardPileSize: 8, otherDeckSizes: {ceos: {drawPile: 3, discardPile: 1},
        corporations: {drawPile: 4, discardPile: 2}, preludes: undefined, globalEvents: undefined},
      spectatorId: 's-synthetic-info', expectedPurgeTimeMs: 0}});
    try {
      expect(wrapper.text()).contains('42');
      expect(wrapper.text()).contains('CEOs');
      const link = wrapper.get('.info-panel-link-field').text();
      await wrapper.get('button[title="Copy"]').trigger('click');
      await flushPromises();
      expect(writeText.mock.calls).deep.eq([[link]]);
      expect(link).contains('/spectator?id=s-synthetic-info');
      expect(wrapper.find('button[title="Copied!"]').exists()).is.true;
      wrapper.unmount();
      expect(vi.getTimerCount()).eq(0);
    } finally {
      wrapper.unmount();
      if (original) {
        Object.defineProperty(navigator, 'clipboard', original);
      } else {
        Reflect.deleteProperty(navigator, 'clipboard');
      }
      vi.useRealTimers();
    }
  });
});
