import {expect} from 'chai';
import {getCards} from '@/client/cards/ClientCardManifest';
import {CardType} from '@/common/cards/CardType';
import {GAME_MODULES} from '@/common/cards/GameModule';
import {agendaInfoById, BONUS_IDS, POLICY_IDS} from '@/common/turmoil/Types';
import {PartyName} from '@/common/turmoil/PartyName';
import {hashToModel} from '@/client/wrybit/visuals/cardlist/CardListModel';
import {buildEntries, countOptions, passesFilters} from '@/client/wrybit/visuals/cardlist/cardListEntries';
import {EXPANSION_OPTIONS} from '@/client/wrybit/visuals/cardlist/cardListOptions';

describe('Wrybit catalogue canonical data', () => {
  it('lists our card metadata and every custom module, with price counts matching visible cards', () => {
    const entries = buildEntries();
    const listedTypes = [CardType.AUTOMATED, CardType.ACTIVE, CardType.EVENT, CardType.PRELUDE,
      CardType.CORPORATION, CardType.CEO, CardType.STANDARD_PROJECT];
    const cards = getCards((card) => listedTypes.includes(card.type));
    expect(entries.filter((entry) => entry.card !== undefined).map((entry) => entry.card)).deep.eq(cards);
    expect(EXPANSION_OPTIONS.map((option) => option.key)).deep.eq(GAME_MODULES);
    const state = {...hashToModel(''), costMin: 5, costMax: 10};
    const expected = cards.filter((card) => card.cost !== undefined && card.cost >= 5 && card.cost <= 10);
    expect(entries.filter((entry) => passesFilters(entry, state)).map((entry) => entry.name)).deep.eq(expected.map((card) => card.name));
    const counts = countOptions(entries, state, 'expansions');
    for (const module of GAME_MODULES) {
      expect(counts.get(module) ?? 0).eq(expected.filter((card) => card.module === module).length);
    }
  });

  it('separates More Parties agendas from Turmoil using our existing party classification', () => {
    const newParties = [PartyName.POPULISTS, PartyName.SPOME, PartyName.EMPOWER,
      PartyName.BUREAUCRATS, PartyName.CENTRISTS, PartyName.TRANSHUMANISTS];
    const ids = [...POLICY_IDS, ...BONUS_IDS];
    const entries = buildEntries().filter((entry) => entry.searchKind === 'agenda');
    expect(entries.map((entry) => entry.name)).deep.eq(ids);
    const state = hashToModel('');
    state.expansions.moreParties = false;
    expect(entries.filter((entry) => passesFilters(entry, state)).map((entry) => entry.name)).deep.eq(
      ids.filter((id) => !newParties.includes(agendaInfoById(id).name as PartyName)),
    );
    state.expansions.moreParties = true;
    state.expansions.turmoil = false;
    expect(entries.filter((entry) => passesFilters(entry, state)).map((entry) => entry.name)).deep.eq(
      ids.filter((id) => newParties.includes(agendaInfoById(id).name as PartyName)),
    );
  });
});
