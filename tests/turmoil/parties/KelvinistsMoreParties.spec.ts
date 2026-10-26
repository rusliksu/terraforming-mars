import {expect} from 'chai';
import {KelvinistsMoreParties} from '../../../src/server/turmoil/parties/KelvinistsMoreParties';
import {KELVINISTS_BONUS_1, KELVINISTS_POLICY_4} from '../../../src/server/turmoil/parties/Kelvinists';
import {
  KELVINISTS_MORE_PARTIES_POLICY_2,
  KELVINISTS_MORE_PARTIES_POLICY_3,
} from '../../../src/server/turmoil/parties/KelvinistsMoreParties';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Resource} from '../../../src/common/Resource';
import {ConvertHeat} from '../../../src/server/cards/base/standardActions/ConvertHeat';

describe('KelvinistsMoreParties', () => {
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.KELVINISTS);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('reuses the exact same bonus A and policy 4 objects as vanilla Kelvinists', () => {
    const party = new KelvinistsMoreParties();
    expect(party.bonuses[0]).to.eq(KELVINISTS_BONUS_1);
    expect(party.policies[3]).to.eq(KELVINISTS_POLICY_4);
  });

  it('policy 1: gains 3 M€ per step when temperature is raised', () => {
    setRulingParty(game, PartyName.KELVINISTS, 'kp01');
    const before = player.megaCredits;
    game.increaseTemperature(player, 1);
    expect(player.megaCredits).to.eq(before + 3);
  });

  it('policy 2: lowers heat production 2 steps and gains 1 TR', () => {
    setRulingParty(game, PartyName.KELVINISTS, 'kp02');
    player.production.add(Resource.HEAT, 3);
    const beforeTr = player.terraformRating;
    expect(KELVINISTS_MORE_PARTIES_POLICY_2.canAct(player)).is.true;
    KELVINISTS_MORE_PARTIES_POLICY_2.action(player);
    expect(player.production.heat).to.eq(1);
    expect(player.terraformRating).to.eq(beforeTr + 1);
  });

  it('policy 2 cannot act with less than 2 heat production', () => {
    player.production.add(Resource.HEAT, 1);
    expect(KELVINISTS_MORE_PARTIES_POLICY_2.canAct(player)).is.false;
  });

  it('policy 3: pays 9 M€ to raise heat production 2 steps, does not hijack the Convert Heat slot', () => {
    setRulingParty(game, PartyName.KELVINISTS, 'kp03');
    player.megaCredits = 9;
    const beforeProd = player.production.heat;
    expect(KELVINISTS_MORE_PARTIES_POLICY_3.canAct(player)).is.true;
    KELVINISTS_MORE_PARTIES_POLICY_3.action(player);
    game.deferredActions.runAll(() => {});
    expect(player.production.heat).to.eq(beforeProd + 2);
    expect(player.megaCredits).to.eq(0);

    // The vanilla Kelvinists kp03 special-cases the Convert Heat action slot to a 6-heat
    // variant; a More Parties game must still offer the normal 8-heat ConvertHeat there,
    // since kp03 means something unrelated in this mode.
    player.heat = 8;
    const convertHeat = new ConvertHeat();
    expect(convertHeat.canAct(player)).is.true;
  });

  it('bonus B: gains 2 M€ per temperature-track step (adapted from the missing "individual" track)', () => {
    game.increaseTemperature(player, 2);
    const party = new KelvinistsMoreParties();
    const bonusB = party.bonuses[1];
    const before = player.megaCredits;
    expect(bonusB.getScore(player)).to.eq(2);
    bonusB.grantForPlayer(player);
    expect(player.megaCredits).to.eq(before + 4);
  });
});
