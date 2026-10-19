import {CardName} from '../src/common/cards/CardName';
import {expect} from 'chai';
import {cardsFromJSON, newCeo, newProjectCard} from '../src/server/createCard';
import {refreshCustomCardRegistry} from '../src/server/cards/CustomCardRegistry';
import {DataDrivenCard} from '../src/server/cards/DataDrivenCard';
import {blankCustomCard} from '../src/common/cards/CustomCardDefinition';
import {CustomCardLibraryEntry} from '../src/common/cards/CustomCardLibraryEntry';
import {InMemoryDatabase} from './testing/InMemoryDatabase';
import {restoreTestDatabase, setTestDatabase} from './testing/setup';

describe('createCard', () => {
  it('newProjectCard: success', () => {
    expect(newProjectCard(CardName.AI_CENTRAL)?.name).eq(CardName.AI_CENTRAL);
  });
  it('newProjectCard: failure', () => {
    expect(newProjectCard(CardName.ECOLINE)).is.undefined;
  });
  it('newProjectCard prelude: success', () => {
    expect(newProjectCard(CardName.ALLIED_BANK)?.name).eq(CardName.ALLIED_BANK);
  });
  it('newProjectCard ceo: success', () => {
    expect(newProjectCard(CardName.HAL9000)?.name).eq(CardName.HAL9000);
  });
  it('newCeo: success', () => {
    expect(newCeo(CardName.HAL9000)?.name).eq(CardName.HAL9000);
  });

  describe('custom cards (registry fallback)', () => {
    afterEach(async () => {
      // Resets the module-level registry back to empty so other tests aren't polluted.
      restoreTestDatabase();
      await refreshCustomCardRegistry();
    });

    it('newProjectCard resolves a name that only exists in the custom card registry', async () => {
      const db = new InMemoryDatabase();
      setTestDatabase(db);
      const entry: CustomCardLibraryEntry = {
        id: 'c1',
        definition: blankCustomCard('My Custom Card'),
        shareCode: 'TMC1fake',
        submittedBy: '',
        status: 'approved',
        createdAt: 1,
      };
      await db.insertCustomCardLibraryEntry(entry);
      await refreshCustomCardRegistry();

      const card = newProjectCard('My Custom Card' as CardName);
      expect(card).is.instanceOf(DataDrivenCard);
      expect(card?.name).eq('My Custom Card');
    });

    it('newProjectCard still returns undefined for a genuinely unknown name', async () => {
      await refreshCustomCardRegistry(); // empty registry (FAKE_DATABASE lists nothing)
      expect(newProjectCard('Not A Real Card At All' as CardName)).is.undefined;
    });

    it('cardsFromJSON (used to reconstruct a saved player\'s hand on reload) resolves a custom card by name', async () => {
      const db = new InMemoryDatabase();
      setTestDatabase(db);
      await db.insertCustomCardLibraryEntry({
        id: 'c5',
        definition: blankCustomCard('Saved Hand Card'),
        shareCode: 'TMC1fake',
        submittedBy: '',
        status: 'approved',
        createdAt: 1,
      });
      await refreshCustomCardRegistry();

      // This is exactly what Player.deserialize() does with a saved player's cardsInHand --
      // the load-bearing case: a custom card in a player's hand must survive a save/reload.
      const hand = cardsFromJSON(['Saved Hand Card' as CardName]);
      expect(hand).to.have.length(1);
      expect(hand[0]).is.instanceOf(DataDrivenCard);
      expect(hand[0].name).eq('Saved Hand Card');
    });

    it('a submitted-but-not-approved custom card is not resolvable', async () => {
      const db = new InMemoryDatabase();
      setTestDatabase(db);
      await db.insertCustomCardLibraryEntry({
        id: 'c2',
        definition: blankCustomCard('Pending Card'),
        shareCode: 'TMC1fake',
        submittedBy: '',
        status: 'submitted',
        createdAt: 1,
      });
      await refreshCustomCardRegistry();

      expect(newProjectCard('Pending Card' as CardName)).is.undefined;
    });
  });
});
