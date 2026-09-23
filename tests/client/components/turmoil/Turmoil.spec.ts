import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import Turmoil from '@/client/components/turmoil/Turmoil.vue';
import {PartyName} from '@/common/turmoil/PartyName';
import {fakePoliticalAgendasModel} from '../testHelpers';
import GlobalEvent from '@/client/components/turmoil/GlobalEvent.vue';
import {GlobalEventName} from '@/common/turmoil/globalEvents/GlobalEventName';

describe('Turmoil', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(Turmoil, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        mixins: [{
          methods: {
            getVisibilityState: () => true,
            setVisibilityState: () => {},
          },
        }],
      },
      props: {
        turmoil: {
          dominant: PartyName.REDS,
          ruling: PartyName.REDS,
          chairman: undefined,
          parties: [],
          lobby: [],
          reserve: [],
          distant: undefined,
          coming: undefined,
          current: undefined,
          politicalAgendas: fakePoliticalAgendasModel(),
          policyActionUsers: [],
        },
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('renders reserved color policy markers as persona cubes', () => {
    const wrapper = shallowMount(Turmoil, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        mixins: [{
          methods: {
            getVisibilityState: () => true,
            setVisibilityState: () => {},
          },
        }],
      },
      props: {
        turmoil: {
          dominant: PartyName.UNITY,
          ruling: PartyName.SCIENTISTS,
          chairman: 'pearl',
          parties: [],
          lobby: [],
          reserve: [],
          distant: undefined,
          coming: undefined,
          current: undefined,
          politicalAgendas: fakePoliticalAgendasModel(),
          policyActionUsers: [
            {color: 'purple', turmoilPolicyActionUsed: true, politicalAgendasActionUsedCount: 0},
            {color: 'pearl', turmoilPolicyActionUsed: true, politicalAgendasActionUsedCount: 0},
          ],
        },
      },
    });

    const purpleMarker = wrapper.find('.policy-use-marker.board-cube--purple');
    const pearlMarker = wrapper.find('.policy-use-marker.board-cube--pearl');

    expect(purpleMarker.exists()).to.be.true;
    expect(purpleMarker.classes()).not.to.include('board-cube--persona');
    expect(pearlMarker.exists()).to.be.true;
    expect(pearlMarker.classes()).to.include('board-cube--persona');
  });

  it('renders delegate counts above player token sprites', () => {
    const wrapper = shallowMount(Turmoil, {
      ...globalConfig,
      global: {
        ...globalConfig.global,
        mixins: [{
          methods: {
            getVisibilityState: () => true,
            setVisibilityState: () => {},
          },
        }],
      },
      props: {
        turmoil: {
          dominant: PartyName.UNITY,
          ruling: PartyName.SCIENTISTS,
          chairman: undefined,
          parties: [{
            name: PartyName.GREENS,
            partyLeader: undefined,
            delegates: [
              {color: 'pearl', number: 2},
              {color: 'red', number: 1},
            ],
          }],
          lobby: [],
          reserve: [{color: 'vanger', number: 3}],
          distant: undefined,
          coming: undefined,
          current: undefined,
          politicalAgendas: fakePoliticalAgendasModel(),
          policyActionUsers: [],
        },
      },
    });

    const partyDelegateCounts = wrapper.findAll('.grid-delegates .count-in-send-delegate');
    const reserveDelegateCounts = wrapper.findAll('.turmoil-reserve .count-in-send-delegate');

    expect(partyDelegateCounts.map((count) => count.text())).deep.eq(['2', '1']);
    expect(reserveDelegateCounts.map((count) => count.text())).deep.eq(['3']);
  });

  it('shows the next generation events in the same board slots', async () => {
    const agendaMixin = {
      methods: {
        getVisibilityState: () => true,
        setVisibilityState: () => {},
      },
    };
    const board = (distant: GlobalEventName, coming: GlobalEventName, current: GlobalEventName) => ({
      dominant: PartyName.REDS,
      ruling: PartyName.REDS,
      chairman: undefined,
      parties: [],
      lobby: [],
      reserve: [],
      distant,
      coming,
      current,
      politicalAgendas: fakePoliticalAgendasModel(),
      policyActionUsers: [],
    });
    const wrapper = shallowMount(Turmoil, {
      ...globalConfig,
      global: {...globalConfig.global, mixins: [agendaMixin]},
      props: {turmoil: board(
        GlobalEventName.GLOBAL_DUST_STORM,
        GlobalEventName.SPONSORED_PROJECTS,
        GlobalEventName.STRONG_SOCIETY)},
    });

    // The next generation advances every slot in place: distant -> coming -> current.
    await wrapper.setProps({turmoil: board(
      GlobalEventName.SOLARNET_SHUTDOWN,
      GlobalEventName.GLOBAL_DUST_STORM,
      GlobalEventName.SPONSORED_PROJECTS)});

    // GlobalEvent.spec.ts proves the card body follows its prop; here the panel has to
    // pass the new events into the same three slots.
    const rendered = wrapper.findAllComponents(GlobalEvent)
      .map((event) => [event.props('type'), event.props('globalEventName')]);
    expect(rendered).to.deep.equal([
      ['distant', GlobalEventName.SOLARNET_SHUTDOWN],
      ['coming', GlobalEventName.GLOBAL_DUST_STORM],
      ['current', GlobalEventName.SPONSORED_PROJECTS],
    ]);
  });
});
