import {expect} from 'chai';
import {AriAdore} from '../../../src/server/cards/sillyfication/AriAdore';
import {Fish} from '../../../src/server/cards/base/Fish';
import {ImportedHydrogen} from '../../../src/server/cards/base/ImportedHydrogen';
import {LunarBeam} from '../../../src/server/cards/base/LunarBeam';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('AriAdore', () => {
  let card: AriAdore;
  let player: TestPlayer;

  beforeEach(() => {
    card = new AriAdore();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
    player.megaCredits = 0;
  });

  it('costs 26 and scores 2 VP', () => {
    expect(card.cost).to.eq(26);
    expect(card.getVictoryPoints(player)).to.eq(2);
  });

  it('gains 2 M€ per unique tag already in play when played', () => {
    player.playedCards.push(new Fish()); // animal
    player.playedCards.push(new LunarBeam()); // energy, earth

    card.bespokePlay(player);

    expect(player.megaCredits).to.eq(2 * 3);
  });

  it('gains 1 M€ per unique tag type in play, on each new type', () => {
    // Fish: animal -> 1st distinct type.
    card.onCardPlayed(player, new Fish());
    expect(player.megaCredits).to.eq(1);

    // Another animal tag -> not new.
    card.onCardPlayed(player, new Fish());
    expect(player.megaCredits).to.eq(1);

    // LunarBeam: energy then earth -> +2 (2 types), then +3 (3 types).
    card.onCardPlayed(player, new LunarBeam());
    expect(player.megaCredits).to.eq(1 + 2 + 3);
  });

  it('ignores event cards', () => {
    card.onCardPlayed(player, new ImportedHydrogen()); // event with earth/space tags
    expect(player.megaCredits).to.eq(0);
  });
});
