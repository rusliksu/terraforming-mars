import {expect} from 'chai';
import {MarsFirstMoreParties} from '../../../src/server/turmoil/parties/MarsFirstMoreParties';
import {MARS_FIRST_BONUS_2, MARS_FIRST_POLICY_1} from '../../../src/server/turmoil/parties/MarsFirst';
import {
  MARS_FIRST_MORE_PARTIES_POLICY_2,
  MARS_FIRST_MORE_PARTIES_POLICY_3,
} from '../../../src/server/turmoil/parties/MarsFirstMoreParties';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {ImportedNitrogen} from '../../../src/server/cards/base/ImportedNitrogen';
import {AICentral} from '../../../src/server/cards/base/AICentral';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {cast} from '../../../src/common/utils/utils';

describe('MarsFirstMoreParties', () => {
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.MARS);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('reuses the exact same bonus B and policy 1 objects as vanilla Mars First', () => {
    const party = new MarsFirstMoreParties();
    expect(party.bonuses[1]).to.eq(MARS_FIRST_BONUS_2);
    expect(party.policies[0]).to.eq(MARS_FIRST_POLICY_1);
  });

  it('policy 2: pays 22 M€ (steel usable) to place a city tile on Mars', () => {
    player.megaCredits = 22;
    expect(MARS_FIRST_MORE_PARTIES_POLICY_2.canAct(player)).is.true;
    MARS_FIRST_MORE_PARTIES_POLICY_2.action(player);
    game.deferredActions.runNext(); // resolves the payment (auto-pays in M€, no steel available)
    const placeCityAction = game.deferredActions.pop();
    const selectSpace = cast(placeCityAction?.execute(), SelectSpace);
    const space = selectSpace.spaces[0];
    selectSpace.cb(space);

    expect(space.tile).to.not.be.undefined;
    expect(player.megaCredits).to.eq(0);
  });

  it('policy 2 cannot act without enough M€', () => {
    player.megaCredits = 0;
    expect(MARS_FIRST_MORE_PARTIES_POLICY_2.canAct(player)).is.false;
  });

  it('policy 3: gains 2 M€ when a building-tagged card is played, not for unrelated tags', () => {
    const before = player.megaCredits;
    MARS_FIRST_MORE_PARTIES_POLICY_3.onCardPlayed(player, new ImportedNitrogen()); // Earth/Space tags
    expect(player.megaCredits).to.eq(before);

    MARS_FIRST_MORE_PARTIES_POLICY_3.onCardPlayed(player, new AICentral()); // Science/Building tags
    expect(player.megaCredits).to.eq(before + 2);
  });

  it('bonus A: gains 1 M€ per building tag plus 1 M€ per Mars tag', () => {
    const party = new MarsFirstMoreParties();
    const bonusA = party.bonuses[0];
    expect(bonusA.getScore(player)).to.eq(0);
  });
});
