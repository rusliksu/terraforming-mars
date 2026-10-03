import {expect} from 'chai';
import {getTurmoilModel} from '../../src/server/models/TurmoilModel';
import {Server} from '../../src/server/models/ServerModel';
import {testGame} from '../TestGame';
import {forcePartiesInPlay} from '../TestingUtils';
import {PartyName} from '../../src/common/turmoil/PartyName';

describe('getTurmoilModel', () => {
  it('builds the model for a vanilla Turmoil game without crashing', () => {
    const [game] = testGame(1, {turmoilExtension: true});
    const model = getTurmoilModel(game);
    expect(model).to.not.be.undefined;
    // The 6 new More Parties parties are never in play in a vanilla game.
    expect(model!.politicalAgendas!.populists).to.be.undefined;
    expect(model!.politicalAgendas!.marsFirst).to.not.be.undefined;
  });

  it('builds the model for a More Parties game, omitting parties not selected into play', () => {
    const restoreShuffle = forcePartiesInPlay(PartyName.BUREAUCRATS, PartyName.CENTRISTS);
    try {
      const [game] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
      const model = getTurmoilModel(game);
      expect(model).to.not.be.undefined;
      const inPlay = new Set(game.turmoil!.parties.map((p) => p.name));
      expect(inPlay.size).to.eq(6);

      // Every party actually in play has an agenda; every party not in play is omitted.
      expect(model!.politicalAgendas!.bureaucrats).to.not.be.undefined;
      expect(model!.politicalAgendas!.centrists).to.not.be.undefined;
      expect(inPlay.has(PartyName.POPULISTS)).to.eq(model!.politicalAgendas!.populists !== undefined);
      expect(inPlay.has(PartyName.SPOME)).to.eq(model!.politicalAgendas!.spome !== undefined);
    } finally {
      restoreShuffle();
    }
  });

  it('does not throw building a full player model for a More Parties game (the original bug)', () => {
    const [, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
    expect(() => Server.getPlayerModel(player)).to.not.throw();
  });
});
