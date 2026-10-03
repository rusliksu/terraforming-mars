import {expect} from 'chai';
import {Tag} from '../../src/common/cards/Tag';
import {PartyName} from '../../src/common/turmoil/PartyName';
import {Game} from '../../src/server/Game';
import {Player} from '../../src/server/Player';
import {testGame} from '../TestGame';
import {forcePartiesInPlay, setRulingParty} from '../TestingUtils';

describe('Party tag persistence', () => {
  for (const [party, policy, tag, count] of [
    [PartyName.UNITY, 'up03', Tag.SPACE, 2],
    [PartyName.EMPOWER, 'empp03', Tag.POWER, 2],
    [PartyName.TRANSHUMANISTS, 'trap01', Tag.WILD, 1],
  ] as const) {
    it(`preserves ${party} tags through reload and removes them when the policy ends`, () => {
      const restore = forcePartiesInPlay(party, PartyName.MARS, PartyName.GREENS);
      try {
        const [game, player] = testGame(2, {turmoilExtension: true, morePartiesExpansion: true});
        setRulingParty(game, party, policy);
        expect(player.tags.count(tag, 'raw')).to.eq(count);

        const restored = Game.deserialize(JSON.parse(JSON.stringify(game.serialize())));
        for (const p of restored.players) {
          expect(p.tags.count(tag, 'raw')).to.eq(count);
        }

        setRulingParty(restored, PartyName.MARS, 'mp01');
        for (const p of restored.players) {
          expect(p.tags.count(tag, 'raw')).to.eq(0);
        }
      } finally {
        restore();
      }
    });
  }

  it('loads old player data without the optional party tag fields', () => {
    const [, player] = testGame(2);
    const data = player.serialize();
    delete data.spaceTagCount;
    delete data.energyTagCount;
    delete data.wildTagCount;

    const restored = Player.deserialize(data);

    expect(restored.tags.extraSpaceTags).to.eq(0);
    expect(restored.tags.extraEnergyTags).to.eq(0);
    expect(restored.tags.extraWildTags).to.eq(0);
  });
});
