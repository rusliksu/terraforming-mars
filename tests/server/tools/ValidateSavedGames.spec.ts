import {expect} from 'chai';
import {validateSerializedGameRows} from '@/server/database/SaveCorpusValidator';
import {testGame} from '@tests/TestGame';

describe('SaveCorpusValidator', () => {
  it('deserializes and serializes every latest save without exposing its contents', () => {
    const [game] = testGame(2);
    const summary = validateSerializedGameRows([
      {gameId: game.id, serialized: JSON.stringify(game.serialize())},
    ]);

    expect(summary).deep.eq({validated: 1});
  });

  it('fails with only the game id when a save cannot be validated', () => {
    expect(() => validateSerializedGameRows([
      {gameId: 'g-private', serialized: '{"cardsInHand":["SECRET_CARD"]}'},
    ])).to.throw('Could not validate latest save for g-private.');
  });
});
