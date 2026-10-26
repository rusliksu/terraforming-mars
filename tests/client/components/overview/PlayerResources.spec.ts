import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import PlayerResources from '@/client/components/overview/PlayerResources.vue';
import {fakePublicPlayerModel} from '../testHelpers';

describe('PlayerResources', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(PlayerResources, {
      ...globalConfig,
      props: {
        player: fakePublicPlayerModel(),
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('shows a Coordination resource box with a +2 production hint when Conglomerates is on', () => {
    const wrapper = shallowMount(PlayerResources, {
      ...globalConfig,
      props: {
        player: fakePublicPlayerModel({conglomeratesData: {coordination: 5}}),
        conglomeratesExpansion: true,
      },
    });

    const box = wrapper.find('[data-test="coordination-resource"]');
    expect(box.exists()).to.be.true;
    expect(box.find('[data-test="stock-count"]').text()).to.eq('5');
    expect(box.find('[data-test="production"]').text()).to.eq('+2');
    // The bevel's inner fill must be a real element, not `::after` -- this icon also carries
    // `tooltip`/`tooltip-bottom` classes, whose own CSS uses `::after` for the hover bubble,
    // and an element can only have one `::after` (the two rules were merging and the tooltip
    // library's opacity:0/positioning was winning, making the fill invisible).
    expect(box.find('.resource_icon--coordination-fill').exists()).to.be.true;
  });

  it('does not show a Coordination resource box when Conglomerates is off', () => {
    const wrapper = shallowMount(PlayerResources, {
      ...globalConfig,
      props: {
        player: fakePublicPlayerModel(),
      },
    });

    expect(wrapper.find('[data-test="coordination-resource"]').exists()).to.be.false;
  });

  it('outlines the resource bar in the player\'s Conglomerates team color', () => {
    const wrapper = shallowMount(PlayerResources, {
      ...globalConfig,
      props: {
        player: fakePublicPlayerModel({conglomeratesTeamColor: 'red'}),
        conglomeratesExpansion: true,
      },
    });

    expect(wrapper.find('.resource_items_cont').classes()).to.include('resource_items_cont--team_red');
  });

  it('does not outline the resource bar when the player has no Conglomerates team', () => {
    const wrapper = shallowMount(PlayerResources, {
      ...globalConfig,
      props: {
        player: fakePublicPlayerModel(),
      },
    });

    expect(wrapper.find('.resource_items_cont').classes()).to.not.include.members(
      ['resource_items_cont--team_red', 'resource_items_cont--team_blue'],
    );
  });
});
