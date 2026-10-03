import {expect} from 'chai';
import {UnityMoreParties} from '../../../src/server/turmoil/parties/UnityMoreParties';
import {UNITY_BONUS_1, UNITY_POLICY_1} from '../../../src/server/turmoil/parties/Unity';
import {
  UNITY_MORE_PARTIES_BONUS_2,
  UNITY_MORE_PARTIES_POLICY_2,
  UNITY_MORE_PARTIES_POLICY_3,
} from '../../../src/server/turmoil/parties/UnityMoreParties';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Resource} from '../../../src/common/Resource';
import {Tag} from '../../../src/common/cards/Tag';

describe('UnityMoreParties', () => {
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.UNITY);
    [, player] = testGame(1, {turmoilExtension: true, coloniesExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('reuses the exact same bonus A and policy 1 objects as vanilla Unity', () => {
    const party = new UnityMoreParties();
    expect(party.bonuses[0]).to.eq(UNITY_BONUS_1);
    expect(party.policies[0]).to.eq(UNITY_POLICY_1);
  });

  it('bonus B: counts Space tags plus titanium production', () => {
    player.production.add(Resource.TITANIUM, 2);
    expect(UNITY_MORE_PARTIES_BONUS_2.getScore(player)).to.eq(2);
  });

  it('policy 2: pays 10 M€ to gain a trade fleet, requires Colonies', () => {
    // A 5-player game so Colonies setup doesn't queue a RemoveColonyFromGame prompt (which
    // needs a real player choice) ahead of this policy's own deferred payment.
    const [coloniesGame, coloniesPlayer] = testGame(5, {turmoilExtension: true, coloniesExtension: true, morePartiesExpansion: true});
    coloniesPlayer.megaCredits = 10;
    expect(UNITY_MORE_PARTIES_POLICY_2.canAct(coloniesPlayer)).is.true;
    const before = coloniesPlayer.colonies.getFleetSize();
    UNITY_MORE_PARTIES_POLICY_2.action(coloniesPlayer);
    coloniesGame.deferredActions.runAll(() => {});
    expect(coloniesPlayer.megaCredits).to.eq(0);
    expect(coloniesPlayer.colonies.getFleetSize()).to.eq(before + 1);
  });

  it('policy 2 cannot act without Colonies enabled', () => {
    const [, otherPlayer] = testGame(1, {turmoilExtension: true, coloniesExtension: false, morePartiesExpansion: true});
    otherPlayer.megaCredits = 10;
    expect(UNITY_MORE_PARTIES_POLICY_2.canAct(otherPlayer)).is.false;
  });

  it('policy 3: applies +2 extra space tags while active', () => {
    expect(player.tags.extraSpaceTags).to.eq(0);
    UNITY_MORE_PARTIES_POLICY_3.onPolicyStartForPlayer(player);
    expect(player.tags.extraSpaceTags).to.eq(2);
    expect(player.tags.count(Tag.SPACE)).to.eq(2);
    UNITY_MORE_PARTIES_POLICY_3.onPolicyEndForPlayer(player);
    expect(player.tags.extraSpaceTags).to.eq(0);
  });
});
