import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {LittleDutchBoy} from '../../../src/server/cards/delta/LittleDutchBoy';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectPlayer} from '../../../src/server/inputs/SelectPlayer';
import {cast} from '../../../src/common/utils/utils';
import {DeltaProjectExpansion} from '../../../src/server/delta/DeltaProjectExpansion';

describe('LittleDutchBoy', () => {
  let card: LittleDutchBoy;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new LittleDutchBoy();
    [/* game */, player, player2] = testGame(2, {deltaProjectExpansion: true});
  });

  it('adds 1 steel to the card when it has no steel stored or no valid target', () => {
    expect(card.resourceCount).eq(0);
    expect(card.action(player)).is.undefined;
    expect(card.resourceCount).eq(1);
  });

  it('does not let you block in the same activation you add steel', () => {
    // Even with a valid target, no stored steel yet means only the add-steel branch runs.
    expect(card.action(player)).is.undefined;
    expect(card.resourceCount).eq(1);
    expect(player2.deltaProjectData!.blocked).is.not.true;
  });

  it('offers a choice once steel is stored and a target is available', () => {
    card.resourceCount = 1;
    const orOptions = cast(card.action(player), OrOptions);
    expect(orOptions.options).has.length(2);
  });

  it('blocks an opponent\'s Delta Project marker for the rest of the generation, in a later activation', () => {
    // Generation 1: add the steel.
    expect(card.action(player)).is.undefined;
    expect(card.resourceCount).eq(1);

    // Generation 2: spend it to block.
    const orOptions = cast(card.action(player), OrOptions);
    const block = orOptions.options.find((o) => o.title.toString().includes('Spend 1 steel'))!;
    const selectPlayer = cast(block.cb(undefined), SelectPlayer);
    selectPlayer.cb(player2);

    expect(card.resourceCount).eq(0);
    expect(player2.deltaProjectData!.blocked).is.true;
    expect(DeltaProjectExpansion.getValidAdvanceSteps(player2)).deep.eq([]);
  });

  it('does not spend real player steel', () => {
    player.steel = 5;
    card.resourceCount = 1;
    const orOptions = cast(card.action(player), OrOptions);
    const block = orOptions.options.find((o) => o.title.toString().includes('Spend 1 steel'))!;
    const selectPlayer = cast(block.cb(undefined), SelectPlayer);
    selectPlayer.cb(player2);

    expect(player.steel).eq(5);
  });

  it('is a blue (Active) card', () => {
    expect(card.type).eq(CardType.ACTIVE);
  });
});
