import {expect} from 'chai';
import {getCards} from '@/client/cards/ClientCardManifest';
import {classifyTileTypes, expansionFeatures} from '@/client/wrybit/create/expansionFeatures';
import {TileType} from '@/common/TileType';
import {CardName} from '@/common/cards/CardName';
import {GAME_MODULES} from '@/common/cards/GameModule';
import {EXPANSION_GROUPINGS, groupExpansions} from '@/client/wrybit/create/expansionGrouping';

describe('own expansion feature projection', () => {
  it('covers every live tile type and distinguishes the Moon Mine from the corporate-era Mine card', () => {
    const cards = getCards(() => true);
    expect(cards.find((card) => card.name === CardName.MINE)?.module).eq('corpera');
    const classified = classifyTileTypes(cards);
    expect(classified.unmapped).deep.eq([]);
    expect(classified.modules.get('moon')).contains(TileType.MOON_MINE);
    expect(classified.modules.get('corpera') ?? []).not.contains(TileType.MOON_MINE);
    expect(classified.modules.get('industries')).contains(TileType.INDUSTRY_HEAT);
    expect(classified.modules.get('robAntilles')).contains(TileType.SUBURBS);
    expect(classified.modules.get('idesOfMars')).contains(TileType.INVAK_CITY);
    expect(classified.modules.get('venusPhase2')).contains(TileType.VENUS_CLOUD_CITY);
  });

  it('describes our additional panels, global tracks, colonies and excavation tokens without foreign facts', () => {
    expect(expansionFeatures('highOrbit', {}, []).layout).eq('ownBoard');
    expect(expansionFeatures('conglomerates', {}, []).layout).eq('ownBoard');
    expect(expansionFeatures('venusPhase2', {}, []).traits.has('newParameters')).is.true;
    expect(expansionFeatures('moon', {}, []).traits.has('newParameters')).is.true;
    expect(expansionFeatures('pathfinders', {}, []).traits.has('newParameters')).is.false;
    expect(expansionFeatures('underworld', {}, []).traits.has('newTiles')).is.true;
    expect(expansionFeatures('community', {colonyTile: 1}, []).traits.has('newTiles')).is.true;
    expect(expansionFeatures('industries', {}, [TileType.INDUSTRY_HEAT]).layout).eq('changesMars');
    expect(expansionFeatures('moreParties', {}, []).layout).eq('cardsAndVariants');
  });

  it('offers all nine source groupings and lists each own module exactly once in every grouping', () => {
    expect(EXPANSION_GROUPINGS).has.length(9);
    for (const grouping of EXPANSION_GROUPINGS) {
      const modules = groupExpansions(grouping).flatMap((group) => group.tiles.map((tile) => tile.module));
      expect(modules).has.length(GAME_MODULES.length);
      expect(new Set(modules).size).eq(GAME_MODULES.length);
      expect(modules).has.members([...GAME_MODULES]);
    }
    const boards = groupExpansions('layout').find((group) => group.key === 'ownBoard')!;
    expect(boards.tiles.map((tile) => tile.module)).includes.members(['highOrbit', 'conglomerates', 'venusPhase2']);
    const tiles = groupExpansions('newTiles').find((group) => group.key === 'with')!;
    expect(tiles.tiles.map((tile) => tile.module)).includes.members(['industries', 'robAntilles', 'idesOfMars', 'sillyfication']);
  });
});
