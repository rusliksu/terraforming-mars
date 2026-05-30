import {expect} from 'chai';
import {MediaGroup} from '../../../src/server/cards/base/MediaGroup';
import {Virus} from '../../../src/server/cards/base/Virus';
import {testGame} from '../../TestGame';
import {formatMessage, runAllActions} from '../../TestingUtils';
import {cast} from '@/common/utils/utils';

describe('MediaGroup', () => {
  it('Should play', () => {
    const card = new MediaGroup();
    const [game, player] = testGame(2);
    cast(card.play(player), undefined);
    card.onCardPlayed(player, new Virus());

    runAllActions(game);

    expect(player.megaCredits).to.eq(3);
    expect(game.gameLog.map(formatMessage)).contains('blue gained 3 M€ because of Media Group');

    card.onCardPlayed(player, card);
    runAllActions(game);

    expect(player.megaCredits).to.eq(3);
  });
});
