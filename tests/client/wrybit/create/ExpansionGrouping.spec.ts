import {expect} from 'chai';
import {CardType} from '@/common/cards/CardType';
import {EXPANSIONS} from '@/common/cards/GameModule';
import {countModuleContents} from '@/client/wrybit/create/expansionContents';
import {groupExpansions} from '@/client/wrybit/create/expansionGrouping';

describe('source grouping with our expansion content', () => {
  it('counts public metadata by content and covers every own expansion exactly once', () => {
    const contents = countModuleContents([
      {module: 'rebalanced', type: CardType.ACTIVE}, {module: 'rebalanced', type: CardType.EVENT},
      {module: 'rebalanced', type: CardType.CORPORATION}, {module: 'underworld', type: 'globalEvents'},
      {module: 'underworld', type: 'milestones'}, {module: 'colonies', type: 'colonyTiles'},
      {module: 'base', type: 'awards'}, {module: undefined, type: 'agendas'},
    ], [{module: 'rebalanced'}]);
    expect(contents.get('rebalanced')?.counts).deep.eq({project: 2, corporation: 1, standardProject: 1});
    expect(contents.get('underworld')?.counts).deep.eq({globalEvent: 1, milestone: 1});
    expect(contents.get('colonies')?.counts).deep.eq({colonyTile: 1});
    expect(contents.has('base')).is.false;
    const groups = groupExpansions('corporation', (module) => contents.get(module) ?? {counts: {}});
    expect(groups[0].tiles.map((tile) => tile.module)).deep.eq(['rebalanced']);
    expect(groups[0].highlight).eq('corporation');
    const listed = groups.flatMap((group) => group.tiles.map((tile) => tile.module));
    expect(listed).has.length(EXPANSIONS.length + 1);
    expect(new Set(listed).size).eq(listed.length);
    expect(listed).has.members(['base', ...EXPANSIONS]);
  });
});
