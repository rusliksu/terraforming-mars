import {expect} from 'chai';
import {PartyRequirement} from '../../../src/server/cards/requirements/PartyRequirement';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';

describe('PartyRequirement', () => {
  it('is not satisfied (and does not throw) when the required party was not selected into play', () => {
    // Force only these 6 into play, leaving Transhumanists out.
    const restoreShuffle = forcePartiesInPlay(
      PartyName.MARS, PartyName.SCIENTISTS, PartyName.UNITY, PartyName.KELVINISTS, PartyName.REDS, PartyName.GREENS);
    try {
      const [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
      expect(game.turmoil!.parties.some((p) => p.name === PartyName.TRANSHUMANISTS)).to.be.false;

      const requirement = new PartyRequirement(PartyName.TRANSHUMANISTS);
      expect(() => requirement.satisfies(player)).to.not.throw();
      expect(requirement.satisfies(player)).to.be.false;
    } finally {
      restoreShuffle();
    }
  });
});
