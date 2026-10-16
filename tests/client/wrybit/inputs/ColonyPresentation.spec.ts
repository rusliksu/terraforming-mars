import {flushPromises, mount, VueWrapper} from '@vue/test-utils';
import {computed, markRaw, shallowRef} from 'vue';
import {expect} from 'chai';
import {vi} from 'vitest';
import PlayerInputFactory from '@/client/components/PlayerInputFactory.vue';
import SelectColony from '@/client/components/SelectColony.vue';
import SourceColony from '@/client/wrybit/inputs/SelectColony.vue';
import PlayerCube from '@/client/wrybit/visuals/common/PlayerCube.vue';
import {INPUT_PRESENTATIONS, InputPresentationRegistry} from '@/client/wrybit/inputs/presentation';
import {boardTabState, selectBoardTab} from '@/client/wrybit/visuals/boardTabs/boardTabState';
import {getColonyOrThrow} from '@/client/colonies/ClientColonyManifest';
import {ColonyName} from '@/common/colonies/ColonyName';
import type {ColonyModel} from '@/common/models/ColonyModel';
import {globalConfig} from '@tests/client/components/getLocalVue';
import {fakeGameModel, fakePlayerViewModel} from '@tests/client/components/testHelpers';

describe('source colony choice with our data and controller', () => {
  it('uses our canonical descriptions, refreshes occupancy and retains selection across modes', async () => {
    const previousTab = boardTabState.active;
    selectBoardTab('mars');
    const colony: ColonyModel = {name: ColonyName.LUNA, colonies: ['pearl'], isActive: true, trackPosition: 4, visitor: undefined};
    const game = fakeGameModel({colonies: [colony]});
    const input = {type: 'colony' as const, title: 'Choose colony', buttonLabel: 'Select', coloniesModel: [colony]};
    const registry = shallowRef<InputPresentationRegistry | undefined>({colony: markRaw(SourceColony)});
    const save = vi.fn();
    const wrapper = mount(PlayerInputFactory, {props: {playerView: fakePlayerViewModel({game}), playerinput: input, onsave: save, showsave: true},
      global: {...globalConfig.global, provide: {[INPUT_PRESENTATIONS as symbol]: computed(() => registry.value)}}});
    try {
      await flushPromises();
      const owner = wrapper.findAllComponents(SelectColony).find((child) => child.vm.$.type === SelectColony)!;
      const uid = owner.vm.$.uid;
      const tile = wrapper.get('[data-test="colony-choice-Luna"]');
      expect(tile.text()).contains(getColonyOrThrow(ColonyName.LUNA).trade.description);
      expect(tile.get('img').attributes('src')).eq('assets/wrybit/colony-planets/luna.webp');
      const initialCubes: VueWrapper<InstanceType<typeof PlayerCube>>[] = tile.findAllComponents(PlayerCube);
      expect(initialCubes.map((cube) => cube.props('color'))).deep.eq(['pearl']);
      expect(boardTabState.active).eq('colonies');
      await tile.get('input').setValue(true);
      await wrapper.setProps({playerinput: {...input, coloniesModel: [{...colony, colonies: ['pearl', 'blue']}]}});
      const refreshedCubes: VueWrapper<InstanceType<typeof PlayerCube>>[] = tile.findAllComponents(PlayerCube);
      expect(refreshedCubes.map((cube) => cube.props('color'))).deep.eq(['pearl', 'blue']);
      expect(save.mock.calls).has.length(0);
      registry.value = undefined;
      await wrapper.vm.$nextTick();
      expect(owner.vm.$.uid).eq(uid);
      expect(owner.vm.selectedColony).eq(ColonyName.LUNA);
      expect(boardTabState.active).eq('mars');
      expect(wrapper.vm.saveData()).eq('saved');
      expect(save.mock.calls).deep.eq([[{type: 'colony', colonyName: ColonyName.LUNA}]]);
    } finally {
      wrapper.unmount();
      selectBoardTab(previousTab);
    }
  });
});
