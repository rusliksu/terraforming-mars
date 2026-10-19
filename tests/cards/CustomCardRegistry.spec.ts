import {expect} from 'chai';
import {
  getAllCustomCardDefinitions,
  getCustomCardDefinition,
  isCustomCardName,
  refreshCustomCardRegistry,
} from '../../src/server/cards/CustomCardRegistry';
import {blankCustomCard} from '../../src/common/cards/CustomCardDefinition';
import {CustomCardLibraryEntry} from '../../src/common/cards/CustomCardLibraryEntry';
import {CardName} from '../../src/common/cards/CardName';
import {InMemoryDatabase} from '../testing/InMemoryDatabase';
import {restoreTestDatabase, setTestDatabase} from '../testing/setup';

describe('CustomCardRegistry', () => {
  let db: InMemoryDatabase;

  beforeEach(() => {
    db = new InMemoryDatabase();
    setTestDatabase(db);
  });

  afterEach(async () => {
    restoreTestDatabase();
    await refreshCustomCardRegistry(); // resets the module-level registry to empty
  });

  function entry(overrides: Partial<CustomCardLibraryEntry> = {}): CustomCardLibraryEntry {
    return {
      id: 'c1',
      definition: blankCustomCard('Registry Card'),
      shareCode: 'x',
      submittedBy: '',
      status: 'approved',
      createdAt: 1,
      ...overrides,
    };
  }

  it('boot-refresh picks up only approved entries', async () => {
    await db.insertCustomCardLibraryEntry(entry({id: 'c1', status: 'approved', definition: blankCustomCard('Approved Card')}));
    await db.insertCustomCardLibraryEntry(entry({id: 'c2', status: 'submitted', definition: blankCustomCard('Submitted Card')}));

    await refreshCustomCardRegistry();

    expect(isCustomCardName('Approved Card' as CardName)).is.true;
    expect(isCustomCardName('Submitted Card' as CardName)).is.false;
    expect(getAllCustomCardDefinitions()).to.have.length(1);
    expect(getCustomCardDefinition('Approved Card' as CardName)?.cardName).eq('Approved Card');
  });

  it('an admin action refresh is immediately visible to the next lookup', async () => {
    await refreshCustomCardRegistry();
    expect(isCustomCardName('Late Card' as CardName)).is.false;

    await db.insertCustomCardLibraryEntry(entry({id: 'c3', status: 'approved', definition: blankCustomCard('Late Card')}));
    await refreshCustomCardRegistry();

    expect(isCustomCardName('Late Card' as CardName)).is.true;
  });

  it('deleting an entry and refreshing removes it from the registry', async () => {
    await db.insertCustomCardLibraryEntry(entry({id: 'c4', status: 'approved', definition: blankCustomCard('Removable Card')}));
    await refreshCustomCardRegistry();
    expect(isCustomCardName('Removable Card' as CardName)).is.true;

    await db.deleteCustomCardLibraryEntry('c4');
    await refreshCustomCardRegistry();
    expect(isCustomCardName('Removable Card' as CardName)).is.false;
  });
});
