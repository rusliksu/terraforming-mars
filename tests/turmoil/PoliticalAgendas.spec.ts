import {expect} from 'chai';
import {IPlayer} from '../../src/server/IPlayer';
import {PartyName} from '../../src/common/turmoil/PartyName';
import {Game} from '../../src/server/Game';
import {forcePartiesInPlay, runAllActions, setRulingParty} from '../TestingUtils';
import {testGame} from '../TestGame';
import {Tag} from '../../src/common/cards/Tag';
import {TestPlayer} from '../TestPlayer';
import {PoliticalAgendas} from '../../src/server/turmoil/PoliticalAgendas';
import {OrOptions} from '../../src/server/inputs/OrOptions';
import {cast} from '@/common/utils/utils';

describe('PoliticalAgendas', () => {
  let player1: TestPlayer;
  let player2: TestPlayer;
  let randomElement: (list: Array<any>) => any;

  beforeEach(() => {
    player1 = TestPlayer.BLUE.newPlayer();
    player2 = TestPlayer.RED.newPlayer();
    randomElement = PoliticalAgendas.randomElement;
  });

  afterEach(() => {
    PoliticalAgendas.randomElement = randomElement;
  });

  const deserialized = [false, true];

  for (const ruling of [true, false]) {
    it(`neutral leadership preserves only a ruling party's policy (ruling=${ruling})`, () => {
      const restore = forcePartiesInPlay(PartyName.UNITY, PartyName.MARS, PartyName.GREENS);
      try {
        const [game, player] = testGame(2, {
          turmoilExtension: true,
          morePartiesExpansion: true,
          politicalAgendasExtension: 'PartyLeaders',
        });
        const turmoil = game.turmoil!;
        const unity = turmoil.getPartyByName(PartyName.UNITY);
        setRulingParty(game, PartyName.UNITY, 'up03');
        if (!ruling) {
          setRulingParty(game, PartyName.MARS, 'mp01');
        }
        const agenda = PoliticalAgendas.getAgenda(turmoil, PartyName.UNITY);
        agenda.bonusId = 'ub02';
        unity.delegates.clear();
        unity.delegates.add(player);
        unity.partyLeader = player;
        PoliticalAgendas.randomElement = (list) => list[0];

        turmoil.sendDelegateToParty('NEUTRAL', PartyName.UNITY, game);
        turmoil.sendDelegateToParty('NEUTRAL', PartyName.UNITY, game);

        expect(unity.partyLeader).to.eq('NEUTRAL');
        expect(agenda.bonusId).to.eq('ub01');
        expect(agenda.policyId).to.eq(ruling ? 'up03' : 'up01');
        for (const p of game.players) {
          expect(p.tags.count(Tag.SPACE, 'raw')).to.eq(ruling ? 2 : 0);
          expect(p.getTitaniumValue()).to.eq(3);
        }

        turmoil.setRulingParty(game);
        expect(PoliticalAgendas.currentAgenda(turmoil).policyId).to.eq('up01');
        for (const p of game.players) {
          expect(p.tags.count(Tag.SPACE, 'raw')).to.eq(0);
          expect(p.getTitaniumValue()).to.eq(4);
        }

        setRulingParty(game, PartyName.MARS, 'mp01');
        for (const p of game.players) {
          expect(p.tags.count(Tag.SPACE, 'raw')).to.eq(0);
          expect(p.getTitaniumValue()).to.eq(3);
        }
      } finally {
        restore();
      }
    });
  }

  deserialized.forEach((deserialize) => {
    const suffix = deserialize ? ', but deserialized' : '';
    it('Standard' + suffix, () => {
      let game = Game.newInstance('gameid', [player1, player2], player1, 'spectatorid', {turmoilExtension: true, politicalAgendasExtension: 'Standard'});
      if (deserialize) {
        game = Game.deserialize(game.serialize());
      }
      const turmoil = game.turmoil!;

      expect(PoliticalAgendas.currentAgenda(turmoil).bonusId).eq('gb01');
      expect(PoliticalAgendas.currentAgenda(turmoil).policyId).eq('gp01');

      const newParty = turmoil.getPartyByName(PartyName.KELVINISTS);
      turmoil.rulingParty = newParty;
      turmoil.chairman = player2;
      PoliticalAgendas.setNextAgenda(turmoil, game);
      runAllActions(game);

      expect(PoliticalAgendas.currentAgenda(turmoil).bonusId).eq('kb01');
      expect(PoliticalAgendas.currentAgenda(turmoil).policyId).eq('kp01');
    });

    it('Chairman mode, human chairperson' + suffix, () => {
      // For the neutral chairman to always pick the second item in the list.
      // Some placeholder parties only have one bonus/policy; fall back to index 0 for those.
      PoliticalAgendas.randomElement = (list: Array<any>) => list[Math.min(1, list.length - 1)];

      let game = Game.newInstance('gameid', [player1, player2], player1, 'spectatorid', {turmoilExtension: true, politicalAgendasExtension: 'Chairman'});
      let newPlayer2: IPlayer = player2;
      if (deserialize) {
        game = Game.deserialize(game.serialize());
        // Get a new copy of player2 who will have a different set of waitingFor.
        newPlayer2 = game.getPlayerById(player2.id);
      }
      const turmoil = game.turmoil!;

      expect(PoliticalAgendas.currentAgenda(turmoil)).deep.eq({bonusId: 'gb02', policyId: 'gp02'});

      const newParty = turmoil.getPartyByName(PartyName.KELVINISTS);
      turmoil.rulingParty = newParty;
      turmoil.chairman = newPlayer2;

      PoliticalAgendas.setNextAgenda(turmoil, game);
      runAllActions(game);

      // The new ruling party is lined up.
      expect(PoliticalAgendas.currentAgenda(turmoil)).deep.eq({bonusId: 'kb02', policyId: 'kp02'});

      const waitingFor = cast(newPlayer2.getWaitingFor(), OrOptions);
      const bonusOptions = cast(waitingFor.options[0], OrOptions);
      bonusOptions.options[0].cb();

      expect(PoliticalAgendas.currentAgenda(turmoil)).deep.eq({bonusId: 'kb01', policyId: 'kp02'});

      // In the real world only one of these two is selectable, but to keep the test simple, invoke both.
      const policyOptions = cast(waitingFor.options[1], OrOptions);
      policyOptions.options[3].cb();

      expect(PoliticalAgendas.currentAgenda(turmoil)).deep.eq({bonusId: 'kb01', policyId: 'kp04'});
    });

    it('Chairman mode, neutral chairperson' + suffix, () => {
      // For the neutral chairperson to always pick the second item.
      // Some placeholder parties only have one bonus/policy; fall back to index 0 for those.
      PoliticalAgendas.randomElement = (list: Array<any>) => list[Math.min(1, list.length - 1)];

      let game = Game.newInstance('gameid', [player1, player2], player1, 'spectatorid', {turmoilExtension: true, politicalAgendasExtension: 'Chairman'});
      if (deserialize) {
        game = Game.deserialize(game.serialize());
      }
      const turmoil = game.turmoil!;

      expect(PoliticalAgendas.currentAgenda(turmoil).bonusId).eq('gb02');
      expect(PoliticalAgendas.currentAgenda(turmoil).policyId).eq('gp02');

      const newParty = turmoil.getPartyByName(PartyName.KELVINISTS);
      turmoil.rulingParty = newParty;
      turmoil.chairman = 'NEUTRAL';
      PoliticalAgendas.setNextAgenda(turmoil, game);
      runAllActions(game);

      expect(PoliticalAgendas.currentAgenda(turmoil).bonusId).eq('kb02');
      expect(PoliticalAgendas.currentAgenda(turmoil).policyId).eq('kp02');
    });
  });

  it('Mars First serialization test', () => {
    let game = Game.newInstance('gameid', [player1, player2], player1, 'spectatorid', {turmoilExtension: true, politicalAgendasExtension: 'Standard'});
    let turmoil = game.turmoil!;
    const marsFirst = turmoil.getPartyByName(PartyName.MARS);
    turmoil.rulingParty = marsFirst;
    turmoil.chairman = player2;
    PoliticalAgendas.setNextAgenda(turmoil, game);
    runAllActions(game);

    expect(PoliticalAgendas.currentAgenda(turmoil).policyId).eq('mp01');

    game = Game.deserialize(game.serialize());
    turmoil = game.turmoil!;

    expect(PoliticalAgendas.currentAgenda(turmoil).bonusId).eq('mb01');
    expect(PoliticalAgendas.currentAgenda(turmoil).policyId).eq('mp01');
  });
});
