import {expect} from 'chai';
import {hashToModel, modelToHash} from '@/client/wrybit/visuals/cardlist/CardListModel';
import {hashToModel as canonicalHashToModel, modelToHash as canonicalModelToHash} from '@/client/components/cardlist/CardListModel';
import {GAME_MODULES} from '@/common/cards/GameModule';

describe('Wrybit catalogue with our hash and module contract', () => {
  it('retains our custom modules and search settings while round-tripping the optional price range', () => {
    const canonical = canonicalHashToModel('');
    for (const module of GAME_MODULES) {
      canonical.expansions[module] = false;
    }
    canonical.expansions.industries = true;
    canonical.expansions.moreParties = true;
    canonical.expansions.rebalanced = true;
    canonical.filterText = 'Synthetic title';
    canonical.namesOnly = false;
    canonical.sortOrder = '1';
    const model = {...canonical, costMin: 5, costMax: 20};
    const restored = hashToModel(modelToHash(model));
    expect(restored.expansions).deep.eq(canonical.expansions);
    expect(restored.filterText).eq(canonical.filterText);
    expect(restored.namesOnly).eq(false);
    expect(restored.sortOrder).eq('1');
    expect(restored.costMin).eq(5);
    expect(restored.costMax).eq(20);
    const noRange = {...canonical, costMin: undefined, costMax: undefined};
    expect(modelToHash(noRange)).eq(canonicalModelToHash(canonical));
  });
});
