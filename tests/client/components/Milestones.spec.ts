import {expect} from 'chai';
import {mount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import Milestones from '@/client/components/Milestones.vue';
import {ClaimedMilestoneModel} from '@/common/models/ClaimedMilestoneModel';
import Milestone from '@/client/components/Milestone.vue';
import {Preferences, PreferencesManager} from '@/client/utils/PreferencesManager';
import {getMilestone} from '@/client/MilestoneAwardManifest';

describe('Milestones', () => {
  const mockMilestone: ClaimedMilestoneModel = {
    name: 'Forester',
    playerName: 'foo',
    color: 'blue',
    scores: [],
  };

  it('shows list and milestones', async () => {
    const milestone = mount(Milestones, {
      ...globalConfig,
      props: {
        milestones: [
          mockMilestone,
        ],
      },
    });
    const toggler = milestone.find('a[class="ma-clickable"]');
    await toggler.trigger('click');
    const test = milestone.find('div[class*="ma-name--milestones');
    expect(test.classes()).to.contain('ma-name');
    expect(test.classes()).to.contain('ma-name--forester');
  });

  it('adds persona cube styling for reserved claimed milestones', () => {
    const milestone = mount(Milestones, {
      ...globalConfig,
      props: {
        milestones: [
          {...mockMilestone, color: 'emerald'},
        ],
      },
    });

    expect(milestone.find('.ma-player-cube .board-cube--emerald').classes()).to.include('board-cube--persona');
  });

  it('milestones show details if previously set to show details', async () => {
    const milestone = mount(Milestones, {
      ...globalConfig,
      props: {
        milestones: [
          mockMilestone,
        ],
        preferences: {
          show_milestone_details: true,
        } as Readonly<Preferences>,
      },
    });


    expect(
      milestone.findAllComponents(Milestone).every((milestoneWrapper) => milestoneWrapper.isVisible()),
    ).to.be.true;
  });

  it('milestones start showing details if no milestone is claimed', async () => {
    const milestone = mount(Milestones, {
      ...globalConfig,
      props: {
        milestones: [
          {...mockMilestone, playerName: undefined, color: undefined},
        ],
        preferences: {
          show_milestone_details: false,
        } as Readonly<Preferences>,
      },
    });

    expect(
      milestone.findAllComponents(Milestone).every((milestoneWrapper) => milestoneWrapper.isVisible()),
    ).to.be.true;
  });

  it('milestones ignore hidden preferences while any milestone is available', async () => {
    const milestone = mount(Milestones, {
      ...globalConfig,
      props: {
        milestones: [
          mockMilestone,
        ],
        preferences: {
          show_milestone_details: false,
        } as Readonly<Preferences>,
      },
    });

    expect(
      milestone.findAllComponents(Milestone).every((milestoneWrapper) => milestoneWrapper.isVisible()),
    ).to.be.true;
  });

  it('milestones start showing descriptions while any milestone is available', async () => {
    const milestone = mount(Milestones, {
      ...globalConfig,
      props: {
        milestones: [
          mockMilestone,
        ],
      },
    });

    expect(milestone.text()).to.include(getMilestone(mockMilestone.name).description);
  });

  it('milestones hide details when all milestones are claimed', async () => {
    const milestone = mount(Milestones, {
      ...globalConfig,
      props: {
        milestones: [
          mockMilestone,
          {...mockMilestone, name: 'Gardener'},
          {...mockMilestone, name: 'Builder'},
        ],
      },
    });

    expect(
      milestone.findAllComponents(Milestone).every((milestoneWrapper) => !milestoneWrapper.isVisible()),
    ).to.be.true;
  });

  it('shows the Conglomerates-scaled claim cost (12) when the expansion is on', () => {
    const wrapper = mount(Milestones, {
      ...globalConfig,
      props: {
        milestones: [],
        preferences: {...PreferencesManager.INSTANCE.values(), learner_mode: true} as Readonly<Preferences>,
        conglomeratesExpansion: true,
      },
    });

    const prices = wrapper.findAll('.milestone-award-price').map((priceWrapper) => parseInt(priceWrapper.text()));
    expect(prices).to.deep.eq([12, 12, 12]);
  });

  it('renders four claimed milestones without available spots in learner mode', () => {
    const names = ['Terraformer', 'Mayor', 'Gardener', 'Builder'] as const;
    const wrapper = mount(Milestones, {
      ...globalConfig,
      props: {
        milestones: names.map((name) => ({...mockMilestone, name})),
        preferences: {...PreferencesManager.INSTANCE.values(), learner_mode: true},
      },
    });

    expect(wrapper.findAll('.milestone-award-inline.paid').map((claim) => claim.text())).to.deep.eq(names);
    expect(wrapper.findAll('.milestone-award-inline.unpaid')).to.have.lengthOf(0);
  });

  it('shows a Coordination icon next to the price when Conglomerates is on', () => {
    const wrapper = mount(Milestones, {
      ...globalConfig,
      props: {
        milestones: [],
        preferences: {...PreferencesManager.INSTANCE.values(), learner_mode: true} as Readonly<Preferences>,
        conglomeratesExpansion: true,
      },
    });

    expect(wrapper.findAll('.milestone-award-coordination')).to.have.lengthOf(3);
  });

  it('does not show a Coordination icon when Conglomerates is off', () => {
    const wrapper = mount(Milestones, {
      ...globalConfig,
      props: {
        milestones: [],
        preferences: {...PreferencesManager.INSTANCE.values(), learner_mode: true} as Readonly<Preferences>,
      },
    });

    expect(wrapper.find('.milestone-award-coordination').exists()).to.be.false;
  });
});
