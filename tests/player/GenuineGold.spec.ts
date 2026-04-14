import {expect} from 'chai';
import {GENUINE_GOLD_NAME} from '../../src/common/Color';
import {Player} from '../../src/server/Player';

describe('GenuineGold', () => {
  it('locks the gold player name across construction and deserialization', () => {
    const player = new Player('Ilya', 'gold', false, 0, 'p-gold');
    expect(player.name).eq(GENUINE_GOLD_NAME);

    const serialized = player.serialize();
    serialized.name = 'Someone Else';

    const deserialized = Player.deserialize(serialized);
    expect(deserialized.color).eq('gold');
    expect(deserialized.name).eq(GENUINE_GOLD_NAME);
  });
});
