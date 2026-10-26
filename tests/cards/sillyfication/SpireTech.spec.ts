import {expect} from 'chai';
import {SpireTech} from '../../../src/server/cards/sillyfication/SpireTech';
import {GanymedeColony} from '../../../src/server/cards/base/GanymedeColony';
import {MicroCredits} from '../../../src/server/cards/sillyfication/MicroCredits';
import {Phase} from '../../../src/common/Phase';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('SpireTech', () => {
  let card: SpireTech;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SpireTech();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('costs 25 and scores 1 VP', () => {
    expect(card.cost).to.eq(25);
    expect(card.getVictoryPoints(player)).to.eq(1);
  });

  it('removes 1 science to gain 1 titanium and 1 M€ when a card with 2+ tags is played', () => {
    player.addResourceTo(card, 3);
    player.megaCredits = 0;
    player.titanium = 0;

    // Ganymede Colony has 3 tags: Jovian, Space, City.
    card.onCardPlayed(player, new GanymedeColony());

    expect(card.resourceCount).to.eq(2);
    expect(player.titanium).to.eq(1);
    expect(player.megaCredits).to.eq(1);
  });

  it('does not trigger for a card with fewer than 2 tags', () => {
    player.addResourceTo(card, 3);
    player.megaCredits = 0;
    player.titanium = 0;

    // Micro Credits has no tags.
    card.onCardPlayed(player, new MicroCredits());

    expect(card.resourceCount).to.eq(3);
    expect(player.titanium).to.eq(0);
    expect(player.megaCredits).to.eq(0);
  });

  it('does nothing if there is no science to spend, even with a qualifying card', () => {
    player.megaCredits = 0;
    player.titanium = 0;

    card.onCardPlayed(player, new GanymedeColony());

    expect(card.resourceCount).to.eq(0);
    expect(player.titanium).to.eq(0);
    expect(player.megaCredits).to.eq(0);
  });

  it('gains 1 science per card not bought during the research phase', () => {
    player.game.phase = Phase.RESEARCH;
    const kept = [new MicroCredits()];
    const discarded = [new MicroCredits(), new GanymedeColony()];

    SpireTech.onDrawCards(player, kept, discarded);

    expect(card.resourceCount).to.eq(2);
  });

  it('does not gain science outside the research phase', () => {
    player.game.phase = Phase.ACTION;
    const discarded = [new MicroCredits()];

    SpireTech.onDrawCards(player, [], discarded);

    expect(card.resourceCount).to.eq(0);
  });
});
