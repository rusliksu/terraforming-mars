import {expect} from 'chai';
import {MicroMills} from '../../../src/server/cards/base/MicroMills';
import {testGame} from '../../TestGame';
import {cast} from '@/common/utils/utils';
import {formatMessage} from '../../TestingUtils';

describe('MicroMills', () => {
  it('Should play', () => {
    const card = new MicroMills();
    const [game, player] = testGame(2);
    game.gameLog.length = 0;
    cast(card.play(player), undefined);

    expect(player.production.heat).to.eq(1);
    expect(game.gameLog.map(formatMessage)).contains('blue gained 1 heat production');
  });
});
