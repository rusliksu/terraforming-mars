import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import GlobalEvent from '@/client/components/turmoil/GlobalEvent.vue';
import CardRenderData from '@/client/components/card/CardRenderData.vue';
import CardDescription from '@/client/components/card/CardDescription.vue';
import CardParty from '@/client/components/card/CardParty.vue';
import {getGlobalEvent} from '@/client/turmoil/ClientGlobalEventManifest';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';

describe('GlobalEvent', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(GlobalEvent, {
      ...globalConfig,
      props: {
        globalEventName: GlobalEventName.GLOBAL_DUST_STORM,
        type: 'current',
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('renders the card of the event it was given', () => {
    const wrapper = shallowMount(GlobalEvent, {
      ...globalConfig,
      props: {globalEventName: GlobalEventName.GLOBAL_DUST_STORM, type: 'current'},
    });

    const dustStorm = getGlobalEvent(GlobalEventName.GLOBAL_DUST_STORM);
    expect(wrapper.get('.global-event-title').text()).to.equal('Global Dust Storm');
    expect(wrapper.getComponent(CardRenderData).props('renderData')).to.deep.equal(dustStorm?.renderData);
    expect(wrapper.getComponent(CardDescription).props('item')).to.equal(dustStorm?.description);
  });

  it('advances to the next event when the same slot receives a new global event', async () => {
    // Turmoil.vue renders the distant/coming/current slots without a key, so one
    // instance receives the next event of its slot every generation.
    const wrapper = shallowMount(GlobalEvent, {
      ...globalConfig,
      props: {globalEventName: GlobalEventName.GLOBAL_DUST_STORM, type: 'current'},
    });
    const firstRenderData = wrapper.getComponent(CardRenderData).props('renderData');

    await wrapper.setProps({globalEventName: GlobalEventName.SOLARNET_SHUTDOWN});

    const solarnet = getGlobalEvent(GlobalEventName.SOLARNET_SHUTDOWN);
    expect(wrapper.get('.global-event-title').text()).to.equal('Solarnet Shutdown');
    expect(firstRenderData).to.not.deep.equal(solarnet?.renderData);
    expect(wrapper.getComponent(CardRenderData).props('renderData')).to.deep.equal(solarnet?.renderData);
    expect(wrapper.getComponent(CardDescription).props('item')).to.equal(solarnet?.description);
    expect(wrapper.findAllComponents(CardParty).map((party) => party.props('party')))
      .to.deep.equal([solarnet?.revealedDelegate, solarnet?.currentDelegate]);
  });

  it('follows an event that moves from coming to current', async () => {
    const wrapper = shallowMount(GlobalEvent, {
      ...globalConfig,
      props: {globalEventName: GlobalEventName.SPONSORED_PROJECTS, type: 'coming', showDistance: true},
    });

    await wrapper.setProps({globalEventName: GlobalEventName.STRONG_SOCIETY});

    const strongSociety = getGlobalEvent(GlobalEventName.STRONG_SOCIETY);
    expect(wrapper.get('.global-event-title').text()).to.equal('Strong Society');
    expect(wrapper.getComponent(CardDescription).props('item')).to.equal(strongSociety?.description);
  });
});
