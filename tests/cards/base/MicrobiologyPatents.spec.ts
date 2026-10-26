import {expect} from 'chai';
import {MicrobiologyPatents} from '../../../src/server/cards/pathfinders/MicrobiologyPatents';
import {Virus} from '../../../src/server/cards/base/Virus';
import {MicroMills} from '../../../src/server/cards/base/MicroMills';
import {testGame} from '../../TestGame';
import {Units} from '../../../src/common/Units';
import {cast} from '@/common/utils/utils';
import {fakeCard} from '../../TestingUtils';
import {Tag} from '../../../src/common/cards/Tag';
import {NereidBiosystems} from '../../../src/server/cards/sillyfication/NereidBiosystems';

describe('MicrobiologyPatents', () => {
  it('Should play', () => {
    const card = new MicrobiologyPatents();
    const [/* game */, player] = testGame(1);

    cast(card.play(player), undefined);
    card.onCardPlayed(player, new Virus());
    expect(player.production.asUnits()).deep.eq(Units.of({megacredits: 1}));

    card.onCardPlayed(player, new MicroMills());
    expect(player.production.asUnits()).deep.eq(Units.of({megacredits: 1}));
  });

  it('Nereid Biosystems: a Jovian-tagged card also triggers the microbe effect', () => {
    const card = new MicrobiologyPatents();
    const [/* game */, player] = testGame(1);
    player.playedCards.push(new NereidBiosystems());

    card.onCardPlayed(player, fakeCard({tags: [Tag.JOVIAN]}));

    expect(player.production.asUnits()).deep.eq(Units.of({megacredits: 1}));
  });
});
