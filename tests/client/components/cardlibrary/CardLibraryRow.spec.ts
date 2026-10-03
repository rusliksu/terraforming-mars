import {mount} from '@vue/test-utils';
import {expect} from 'chai';
import {globalConfig} from '../getLocalVue';
import CardLibraryRow from '@/client/components/cardlibrary/CardLibraryRow.vue';
import {CustomCardLibraryEntry, CustomCardEntryId} from '@/common/cards/CustomCardLibraryEntry';
import {blankCustomCard} from '@/common/cards/CustomCardDefinition';
import {encodeCustomCard} from '@/common/cards/customCardCodec';

function entry(overrides: Partial<CustomCardLibraryEntry> = {}): CustomCardLibraryEntry {
  const definition = blankCustomCard('Blank Card');
  return {
    id: 'c1' as CustomCardEntryId,
    definition,
    shareCode: encodeCustomCard(definition),
    submittedBy: 'Tester',
    status: 'submitted',
    createdAt: 1000,
    ...overrides,
  };
}

describe('CardLibraryRow', () => {
  it('mounts without errors', () => {
    const wrapper = mount(CardLibraryRow, {...globalConfig, props: {entry: entry()}});
    expect(wrapper.exists()).to.be.true;
  });

  it('hides admin controls when isAdmin is false', () => {
    const wrapper = mount(CardLibraryRow, {...globalConfig, props: {entry: entry(), isAdmin: false}});
    expect(wrapper.findAll('button').some((b) => b.text() === 'Approve')).is.false;
    expect(wrapper.findAll('button').some((b) => b.text() === 'Delete')).is.false;
  });

  it('disables Approve for a submission with no curated effect yet', () => {
    const wrapper = mount(CardLibraryRow, {...globalConfig, props: {entry: entry(), isAdmin: true}});
    const approveButton = wrapper.findAll('button').find((b) => b.text() === 'Approve')!;
    expect((approveButton.element as HTMLButtonElement).disabled).is.true;
  });

  it('emits delete with the entry id when confirmed', async () => {
    const wrapper = mount(CardLibraryRow, {...globalConfig, props: {entry: entry({id: 'c-target' as CustomCardEntryId}), isAdmin: true}});
    const deleteButton = wrapper.findAll('button').find((b) => b.text() === 'Delete')!;
    await deleteButton.trigger('click');
    expect(wrapper.emitted('delete')).to.deep.eq([['c-target']]);
  });
});
