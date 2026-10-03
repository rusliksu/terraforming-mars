import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import TurmoilAgendaContainer from '@/client/components/cardlist/TurmoilAgendaContainer.vue';
import {getAgendaOrThrow} from '@/client/turmoil/ClientAgendaManifest';

describe('TurmoilAgendaContainer', () => {
  it('mounts without errors', () => {
    const wrapper = mount(TurmoilAgendaContainer, {
      ...globalConfig,
      props: {
        agendaId: 'mp01',
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('keeps the description visible in the custom card list', async () => {
    const wrapper = mount(TurmoilAgendaContainer, {
      ...globalConfig,
      props: {
        agendaId: 'rp02',
      },
    });
    expect(wrapper.find('.description').exists()).to.be.true;

    await wrapper.find('.container').trigger('click');

    expect(wrapper.find('.description').exists()).to.be.true;
    expect(wrapper.find('.description').text()).to.eq(getAgendaOrThrow('rp02').description);
  });

  it('shows the More Parties description text when that expansion is active', async () => {
    const wrapper = mount(TurmoilAgendaContainer, {
      ...globalConfig,
      props: {
        agendaId: 'rp02',
        morePartiesExpansion: true,
      },
    });

    await wrapper.find('.container').trigger('click');

    expect(wrapper.find('.description').text()).to.eq(getAgendaOrThrow('rp02', true).description);
  });
});
