import {shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import Turmoil from '@/client/components/turmoil/Turmoil.vue';
import {PartyName} from '@/common/turmoil/PartyName';
import {fakePoliticalAgendasModel} from '../testHelpers';

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

    const partyDelegateCounts = wrapper.findAll('.grid-delegates .player-token__number');
    const reserveDelegateCounts = wrapper.findAll('.turmoil-reserve .player-token__number');

    expect(partyDelegateCounts.map((count) => count.text())).deep.eq(['2', '1']);
    expect(reserveDelegateCounts.map((count) => count.text())).deep.eq(['3']);
  });
});
