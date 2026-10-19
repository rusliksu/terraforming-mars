import {expect} from 'chai';
import {NereidBiosystems} from '../../../src/server/cards/sillyfication/NereidBiosystems';
import {GanymedeColony} from '../../../src/server/cards/base/GanymedeColony';
import {RegolithEaters} from '../../../src/server/cards/base/RegolithEaters';
import {MicroCredits} from '../../../src/server/cards/sillyfication/MicroCredits';
import {Tag} from '../../../src/common/cards/Tag';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';

describe('NereidBiosystems', () => {
  let card: NereidBiosystems;
  let player: TestPlayer;

  beforeEach(() => {
    card = new NereidBiosystems();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('has a Jovian tag and a Microbe tag', () => {
    expect(card.tags).to.deep.eq([Tag.JOVIAN, Tag.MICROBE]);
  });

  it('starts with 46 M€', () => {
    expect(card.startingMegaCredits).to.eq(46);
  });

  it('initial action draws 1 Jovian-tag card and 1 Microbe-tag card', () => {
    player.cardsInHand = [];
    player.defer(card.initialAction(player));
    runAllActions(player.game);

    expect(player.cardsInHand).to.have.length(2);
    expect(player.cardsInHand.some((c) => c.tags.includes(Tag.JOVIAN))).is.true;
    expect(player.cardsInHand.some((c) => c.tags.includes(Tag.MICROBE))).is.true;
  });

  it('counts Jovian tags as microbe tags for tag totals', () => {
    player.tagsForTest = {jovian: 2, microbe: 1};
    // 1 real microbe tag + 2 substituted from Jovian.
    expect(player.tags.count(Tag.MICROBE)).to.eq(3);
  });

  it('treats a played Jovian-tag card as having a microbe tag', () => {
    expect(player.tags.cardHasTag(new GanymedeColony(), Tag.MICROBE)).is.true;
  });

  it('adds 1 microbe per relevant tag - its own play counts twice (real Jovian + real Microbe)', () => {
    card.onCardPlayed(player, card);
    runAllActions(player.game);

    // Card only holds microbes itself so far, so it auto-selects as the target.
    expect(card.resourceCount).to.eq(2);
  });

  it('adds only 1 microbe for a Jovian-only card (no real Microbe tag)', () => {
    card.onCardPlayed(player, new GanymedeColony());
    runAllActions(player.game);

    expect(card.resourceCount).to.eq(1);
  });

  it('also triggers for a Microbe-tagged card with no Jovian tag - the buff', () => {
    card.onCardPlayed(player, new RegolithEaters());
    runAllActions(player.game);

    expect(card.resourceCount).to.eq(1);
  });

  it('does not add microbes for a card without a Jovian or microbe tag', () => {
    card.onCardPlayed(player, new MicroCredits());
    runAllActions(player.game);

    expect(card.resourceCount).to.eq(0);
  });

  it('does not score VP for its microbes', () => {
    player.addResourceTo(card, 7);
    expect(card.getVictoryPoints(player)).to.eq(0);
  });

  it('microbes here are spendable towards paying for cards', () => {
    expect(player.getSpendable('nereidMicrobes')).to.eq(0);
    player.addResourceTo(card, 3);
    expect(player.getSpendable('nereidMicrobes')).to.eq(3);
  });
});
