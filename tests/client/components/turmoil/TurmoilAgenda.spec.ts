import {mount, shallowMount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import TurmoilAgenda from '@/client/components/turmoil/TurmoilAgenda.vue';
import {getAgendaOrThrow} from '@/client/turmoil/ClientAgendaManifest';
import {BonusId, PolicyId} from '@/common/turmoil/Types';

// Every id whose content differs under the More Parties expansion's "Political Agendas" rework
// -- i.e. the *MoreParties.ts party classes exist and override the vanilla class for that party.
const REWORKED_IDS: ReadonlyArray<BonusId | PolicyId> = [
  'mb01', 'mp02', 'mp03', 'mp04',
  'sp01', 'sp03', 'sp04',
  'ub02', 'up02', 'up03', 'up04',
  'kb02', 'kp01', 'kp02', 'kp03',
  'rb02', 'rp02', 'rp03', 'rp04',
  'gp03', 'gp04',
];

// Every one of the 6 new parties' ids with real, implemented content (a bespoke icon exists).
// popb02 and trap03 are compromises (see their own comments in Populists.ts/Transhumanists.ts)
// rather than faithful implementations of the original EPIC-referencing text, but they do have
// real behavior and a bespoke icon, so they belong here rather than in the "not implemented" list.
const NEW_PARTY_IMPLEMENTED_IDS: ReadonlyArray<BonusId | PolicyId> = [
  'popb01', 'popb02', 'popp01', 'popp02', 'popp03', 'popp04',
  'spob01', 'spob02', 'spop01', 'spop02', 'spop03',
  'empb01', 'empb02', 'empp01', 'empp02', 'empp03', 'empp04',
  'burb01', 'burb02', 'burp01', 'burp02', 'burp03', 'burp04',
  'cenb01', 'cenb02', 'cenp01', 'cenp02', 'cenp03', 'cenp04',
  'trab01', 'trab02', 'trap01', 'trap02', 'trap03', 'trap04',
];

// The remaining new-party ids: real game concepts this codebase doesn't model, sharing the
// generic "Not implemented" display.
const NEW_PARTY_NOT_IMPLEMENTED_IDS: ReadonlyArray<BonusId | PolicyId> = [
  'spop04',
];

// Options API computed properties aren't reflected in TurmoilAgenda's props-only public type,
// so tests reach into the raw vm to read them -- same pattern used elsewhere in this suite.
function resolvedDescriptionOf(wrapper: ReturnType<typeof shallowMount>): string {
  return (wrapper.vm as unknown as {resolvedDescription: string}).resolvedDescription;
}

describe('TurmoilAgenda', () => {
  it('mounts without errors', () => {
    const wrapper = shallowMount(TurmoilAgenda, {
      ...globalConfig,
      props: {
        id: 'mp01',
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('mounts without errors with a party badge', () => {
    const wrapper = shallowMount(TurmoilAgenda, {
      ...globalConfig,
      props: {
        id: 'mp01',
        showPartyBadge: true,
      },
    });
    expect(wrapper.exists()).to.be.true;
  });

  it('shows the vanilla hover description by default', () => {
    const wrapper = shallowMount(TurmoilAgenda, {
      ...globalConfig,
      props: {
        id: 'rp02',
      },
    });
    expect(resolvedDescriptionOf(wrapper)).to.eq(getAgendaOrThrow('rp02').description);
  });

  it('shows the More Parties hover description when the expansion is active', () => {
    const wrapper = shallowMount(TurmoilAgenda, {
      ...globalConfig,
      props: {
        id: 'rp02',
        morePartiesExpansion: true,
      },
    });
    expect(resolvedDescriptionOf(wrapper)).to.eq(getAgendaOrThrow('rp02', true).description);
    expect(resolvedDescriptionOf(wrapper)).to.not.eq(getAgendaOrThrow('rp02').description);
  });

  it('falls back to the vanilla description under More Parties for ids whose content is unchanged', () => {
    const wrapper = shallowMount(TurmoilAgenda, {
      ...globalConfig,
      props: {
        id: 'gb01',
        morePartiesExpansion: true,
      },
    });
    expect(resolvedDescriptionOf(wrapper)).to.eq(getAgendaOrThrow('gb01').description);
  });

  it('teleports a tooltip to <body> on hover, positioned from the trigger, and removes it on mouseleave', async () => {
    const wrapper = mount(TurmoilAgenda, {
      ...globalConfig,
      props: {
        id: 'rp02',
      },
      attachTo: document.body,
    });
    expect(document.body.querySelector('.agenda-tooltip-portal')).to.be.null;

    await wrapper.find('.agenda-icon').trigger('mouseenter');
    const portal = document.body.querySelector('.agenda-tooltip-portal');
    expect(portal).to.not.be.null;
    expect(portal!.textContent!.trim()).to.eq(getAgendaOrThrow('rp02').description);

    await wrapper.find('.agenda-icon').trigger('mouseleave');
    expect(document.body.querySelector('.agenda-tooltip-portal')).to.be.null;

    wrapper.unmount();
  });

  // rp04's rework restricts scope (Mars-only parameters) but its vanilla icon already only ever
  // depicted the 3 Mars parameters, so it's deliberately reused as-is -- markup is identical,
  // only the hover description differs.
  const ICON_UNCHANGED_IDS: ReadonlyArray<BonusId | PolicyId> = ['rp04'];

  for (const id of REWORKED_IDS) {
    it(`mounts ${id} without errors, vanilla and More Parties, with the expected markup`, () => {
      const vanilla = shallowMount(TurmoilAgenda, {...globalConfig, props: {id}});
      const reworked = shallowMount(TurmoilAgenda, {...globalConfig, props: {id, morePartiesExpansion: true}});
      expect(vanilla.exists()).to.be.true;
      expect(reworked.exists()).to.be.true;
      if (ICON_UNCHANGED_IDS.includes(id)) {
        expect(vanilla.html()).to.eq(reworked.html());
      } else {
        expect(vanilla.html()).to.not.eq(reworked.html());
      }
      expect(resolvedDescriptionOf(reworked)).to.eq(getAgendaOrThrow(id, true).description);
    });
  }

  for (const id of NEW_PARTY_IMPLEMENTED_IDS) {
    it(`mounts new-party id ${id} without errors and shows its real description`, () => {
      const wrapper = shallowMount(TurmoilAgenda, {...globalConfig, props: {id}});
      expect(wrapper.exists()).to.be.true;
      expect(wrapper.text()).to.not.include('Not implemented');
      expect(resolvedDescriptionOf(wrapper)).to.eq(getAgendaOrThrow(id).description);
    });
  }

  for (const id of NEW_PARTY_NOT_IMPLEMENTED_IDS) {
    it(`mounts new-party id ${id} without errors and shows the "Not implemented" fallback`, () => {
      const wrapper = shallowMount(TurmoilAgenda, {...globalConfig, props: {id}});
      expect(wrapper.exists()).to.be.true;
      expect(wrapper.text()).to.include('Not implemented');
      expect(resolvedDescriptionOf(wrapper)).to.eq(getAgendaOrThrow(id).description);
    });
  }
});
