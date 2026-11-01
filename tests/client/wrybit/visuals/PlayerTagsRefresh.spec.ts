import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import PlayerTags from '@/client/components/overview/PlayerTags.vue';
import {Tag} from '@/common/cards/Tag';
import {fakePublicPlayerModel, fakeViewModel} from '@tests/client/components/testHelpers';
import {globalConfig} from '@tests/client/components/getLocalVue';
import type {TagDetail} from '@/client/components/overview/playerTagDetails';

describe('Our shared tag display after model refresh', () => {
  it('updates displayed tag counts and public discounts without remounting', async () => {
    const player = fakePublicPlayerModel({cardDiscount: 2, tags: {[Tag.EARTH]: 1}});
    const wrapper = shallowMount(PlayerTags, {...globalConfig, props: {player, playerView: fakeViewModel({thisPlayer: player})}});
    try {
      expect(wrapper.vm.all.discount).eq(2);
      expect(wrapper.vm.tags.find((tag: TagDetail) => tag.name === Tag.EARTH)?.count).eq(1);
      await wrapper.setProps({player: {...player, cardDiscount: 5, tags: {...player.tags, [Tag.EARTH]: 4}}});
      expect(wrapper.vm.all.discount).eq(5);
      expect(wrapper.vm.tags.find((tag: TagDetail) => tag.name === Tag.EARTH)?.count).eq(4);
    } finally {
      wrapper.unmount();
    }
  });
});
