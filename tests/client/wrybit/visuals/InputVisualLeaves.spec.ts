import {flushPromises, mount} from '@vue/test-utils';
import {expect} from 'chai';
import {vi} from 'vitest';
import CardIntroBlock from '@/client/wrybit/visuals/CardIntroBlock.vue';
import SpaceConfirmPopover from '@/client/wrybit/visuals/SpaceConfirmPopover.vue';
import PlacementBanner from '@/client/wrybit/visuals/board/PlacementBanner.vue';
import ServerUpdateOverlay from '@/client/wrybit/visuals/common/ServerUpdateOverlay.vue';
import ShiftAresGlobalParameters from '@/client/wrybit/visuals/ShiftAresGlobalParameters.vue';
import {CardName} from '@/common/cards/CardName';
import {CardType} from '@/common/cards/CardType';
import {ShiftAresGlobalParametersModel} from '@/common/models/PlayerInputModel';
import {fakePlayerViewModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';

describe('Pure Wrybit input visuals', () => {
  it('uses our custom wire card metadata and combined display name', () => {
    const name = 'Synthetic custom intro' as CardName;
    const wrapper = mount(CardIntroBlock, {...globalConfig, props: {card: name, title: 'Select an option',
      model: {name, combinedDisplayName: 'Our combined card', customCard: {type: CardType.ACTIVE, cost: 20, tags: [],
        module: 'base', metadata: {description: 'Our wire description'}, compatibility: []}}}});
    try {
      expect(wrapper.get('.card-intro-name').text()).eq('Our combined card');
      expect(wrapper.get('.or-tab-intro-hint').text()).eq('Our wire description');
      expect(wrapper.find('.wrybit-card').exists()).is.true;
    } finally {
      wrapper.unmount();
    }
  });

  it('keeps our Ares input response and server-supplied thresholds', async () => {
    const onsave = vi.fn();
    const playerinput: ShiftAresGlobalParametersModel = {title: 'Ares choice', buttonLabel: 'Confirm our adjustment',
      type: 'aresGlobalParameters', aresData: {includeHazards: true, milestoneResults: [], hazardData: {
        erosionOceanCount: {threshold: 3, available: true}, removeDustStormsOceanCount: {threshold: 6, available: true},
        severeErosionTemperature: {threshold: -4, available: true}, severeDustStormOxygen: {threshold: 5, available: false},
      }}};
    const wrapper = mount(ShiftAresGlobalParameters, {...globalConfig,
      props: {playerinput, playerView: fakePlayerViewModel(), onsave, showsave: true}});
    try {
      expect(wrapper.text()).contains('4 oceans');
      expect(wrapper.text()).contains('-2 °C');
      expect(wrapper.find('input[name="oxygenDelta"]').exists()).is.false;
      await wrapper.get('input[name="lowOceanDelta"][value="1"]').setValue();
      await wrapper.get('input[name="highOceanDelta"][value="-1"]').setValue();
      await wrapper.get('input[name="temperatureDelta"][value="1"]').setValue();
      await wrapper.get('button').trigger('click');
      expect(onsave.mock.calls).deep.eq([[{type: 'aresGlobalParameters',
        response: {lowOceanDelta: 1, highOceanDelta: -1, temperatureDelta: 1, oxygenDelta: 0}}]]);
    } finally {
      wrapper.unmount();
    }
  });

  it('shows our generated card text and suppresses only generic question headings', async () => {
    const wrapper = mount(CardIntroBlock, {...globalConfig, props: {card: CardName.ASTEROID, title: 'Select an option'}});
    try {
      expect(wrapper.text()).contains('Raise temperature 1 step and gain 2 titanium.');
      expect(wrapper.find('.card-intro-question').exists()).is.false;
      await wrapper.setProps({title: 'Select a player to remove plants from'});
      expect(wrapper.get('.card-intro-question').text()).eq('Select a player to remove plants from');
    } finally {
      wrapper.unmount();
    }
  });

  it('uses supplied placement gains and rules without inventing standard tile rewards', () => {
    const wrapper = mount(PlacementBanner, {...globalConfig, props: {description: {
      tile: 'ocean', title: 'Our custom ocean', gains: [{icon: undefined, value: '+7', label: 'Custom production'}],
      rules: [{kind: 'required', text: 'Only the server-provided spaces'}],
    }}});
    try {
      expect(wrapper.text()).contains('+7');
      expect(wrapper.text()).contains('Custom production');
      expect(wrapper.text()).contains('Only the server-provided spaces');
      expect(wrapper.text()).not.contains('adjacent ocean');
      expect(wrapper.text()).not.contains('TR');
    } finally {
      wrapper.unmount();
    }
  });

  it('opens with an initial anchor, reports acceptance/Escape and cleans its body portal', async () => {
    const anchor = document.createElement('button');
    document.body.appendChild(anchor);
    const position = vi.spyOn(anchor, 'getBoundingClientRect').mockReturnValue({left: 300, top: 200, right: 350, bottom: 250} as DOMRect);
    const wrapper = mount(SpaceConfirmPopover, {...globalConfig, props: {anchor}});
    try {
      await flushPromises();
      const popup = document.body.querySelector('.wrybit-ui .space-confirm') as HTMLElement;
      expect(popup).not.eq(null);
      expect(popup.style.left).not.eq('-9999px');
      popup.querySelector<HTMLButtonElement>('.space-confirm-button--yes')!.click();
      expect(wrapper.emitted('accept')).length(1);
      window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
      expect(wrapper.emitted('dismiss')).length(1);
      await wrapper.setProps({anchor: undefined});
      window.dispatchEvent(new KeyboardEvent('keydown', {key: 'Escape'}));
      expect(wrapper.emitted('dismiss')).length(1);
      wrapper.unmount();
      expect(document.body.querySelector('.wrybit-ui .space-confirm')).eq(null);
    } finally {
      wrapper.unmount(); position.mockRestore(); anchor.remove();
    }
  });

  it('takes update status from the owner and requests reload without owning it', async () => {
    const wrapper = mount(ServerUpdateOverlay, globalConfig);
    try {
      expect(wrapper.find('[role="alertdialog"]').exists()).is.false;
      await wrapper.setProps({phase: 'ready'});
      expect(wrapper.text()).contains('Server updated successfully');
      expect(wrapper.text()).not.contains('All games are saved.');
      await wrapper.get('button').trigger('click');
      expect(wrapper.emitted('reload')).length(1);
      await wrapper.setProps({savedMessage: 'All games are saved.'});
      expect(wrapper.text()).contains('All games are saved.');
      await wrapper.setProps({phase: 'none'});
      expect(wrapper.find('[role="alertdialog"]').exists()).is.false;
    } finally {
      wrapper.unmount();
    }
  });
});
