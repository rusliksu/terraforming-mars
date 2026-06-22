import {expect} from 'chai';
import {mount} from '@vue/test-utils';
import {globalConfig} from './getLocalVue';
import Milestones from '@/client/components/Milestones.vue';
import {ClaimedMilestoneModel} from '@/common/models/ClaimedMilestoneModel';
import Milestone from '@/client/components/Milestone.vue';
import {Preferences} from '@/client/utils/PreferencesManager';
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
});
