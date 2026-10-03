import {expect} from 'chai';
import {CorporateEspionage} from '../../../src/server/cards/delta/CorporateEspionage';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {SelectPlayer} from '../../../src/server/inputs/SelectPlayer';
import {cast} from '../../../src/common/utils/utils';
import {CardType} from '../../../src/common/cards/CardType';

describe('CorporateEspionage', () => {
  let card: CorporateEspionage;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new CorporateEspionage();
    [game, player, player2] = testGame(2, {deltaProjectExpansion: true});
  });

  it('cannot play with no valid target', () => {
    // player2 is at position 0, not a valid target.
    expect(card.canPlay(player)).is.false;
  });

  it('cannot target a player already at the VP level', () => {
    player2.deltaProjectData!.position = 10;
    expect(card.canPlay(player)).is.false;
  });

  it('reduces the target by 1 step, and grants your own step ignoring a missing tag', () => {
    player2.deltaProjectData!.position = 3;
    player.production.override({megacredits: 0});

    const selectPlayer = cast(card.bespokePlay(player), SelectPlayer);
    selectPlayer.cb(player2);

    // Target dropped from 3 (Earth) to 2 (Power) - triggers a choice, not immediate M€.
    expect(player2.deltaProjectData!.position).eq(2);
    // You advance from 0 to 1 (Building) with no Building tag, ignoring the requirement.
    expect(player.deltaProjectData!.position).eq(1);
  });

  it('both players receive the bonus of their resulting position', () => {
    player2.deltaProjectData!.position = 3; // Earth
    player2.production.override({megacredits: 0});

    const selectPlayer = cast(card.bespokePlay(player), SelectPlayer);
    selectPlayer.cb(player2);

    // player2 drops to position 2 (Power) and player advances to position 1 (Building) -
    // both are choice-based rewards, so both are queued as deferred actions.
    expect(game.deferredActions).has.lengthOf(2);
    expect(player2.deltaProjectData!.position).eq(2);
    expect(player.deltaProjectData!.position).eq(1);
  });

  it('is a red (Event) card, unlike the other Delta Project cards', () => {
    expect(card.type).eq(CardType.EVENT);
  });
});
