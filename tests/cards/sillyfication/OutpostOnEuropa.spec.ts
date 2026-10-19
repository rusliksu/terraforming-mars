import {expect} from 'chai';
import {runAllActions, fakeCard} from '../../TestingUtils';
import {RegolithEaters} from '../../../src/server/cards/base/RegolithEaters';
import {Tardigrades} from '../../../src/server/cards/base/Tardigrades';
import {ICard} from '../../../src/server/cards/ICard';
import {NereidBiosystems} from '../../../src/server/cards/sillyfication/NereidBiosystems';
import {OutpostOnEuropa} from '../../../src/server/cards/sillyfication/OutpostOnEuropa';
import {IGame} from '../../../src/server/IGame';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {TestPlayer} from '../../TestPlayer';
import {Tag} from '../../../src/common/cards/Tag';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('OutpostOnEuropa', () => {
  let card: OutpostOnEuropa;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new OutpostOnEuropa();
    [game, player, player2] = testGame(2);
  });

  it('has a Jovian tag and one Microbe tag', () => {
    expect(card.tags).to.deep.eq([Tag.JOVIAN, Tag.MICROBE]);
  });

  it('requires 3 Microbe tags', () => {
    player.playedCards.push(fakeCard({tags: [Tag.MICROBE]}));
    expect(card.canPlay(player)).is.false;
    player.playedCards.push(fakeCard({tags: [Tag.MICROBE]}));
    expect(card.canPlay(player)).is.false;
    player.playedCards.push(fakeCard({tags: [Tag.MICROBE]}));
    expect(card.canPlay(player)).is.true;
  });

  it('Nereid Biosystems: a plain Jovian tag also satisfies the Microbe requirement', () => {
    // Nereid itself already carries a real Microbe tag, so it isn't a clean before/after
    // on its own - compare the raw Microbe count with and without an extra, otherwise
    // Microbe-less, Jovian-tagged card to isolate the substitution specifically.
    player.playedCards.push(new NereidBiosystems());
    const beforeExtraJovian = player.tags.count(Tag.MICROBE, 'default');

    player.playedCards.push(fakeCard({tags: [Tag.JOVIAN]}));
    const afterExtraJovian = player.tags.count(Tag.MICROBE, 'default');

    expect(afterExtraJovian).to.eq(beforeExtraJovian + 1);
  });

  it('Nereid Biosystems does not inflate the Jovian-counting effect - it only substitutes for Microbe', () => {
    player.playedCards.push(new NereidBiosystems());
    player.playedCards.push(fakeCard({tags: [Tag.JOVIAN]}));
    const microbeCard = new RegolithEaters();
    player.playedCards.push(microbeCard);

    cast(card.play(player), undefined);
    runAllActions(game);

    // Nereid Biosystems is itself a microbe-resource card, so there's a choice now.
    const action = cast(player.popWaitingFor(), SelectCard<ICard>);
    action.cb([microbeCard]);

    // 1 (this card) + 1 (Nereid's own Jovian tag) + 1 (the extra Jovian-tagged card) = 3 -
    // Nereid's "Jovian counts as Microbe" only affects Microbe-tag counts, not
    // Jovian-tag counts, so it shouldn't inflate this count at all.
    expect(microbeCard.resourceCount).to.eq(3);
  });

  it('counts Jovian tags across all players, including its own', () => {
    player.playedCards.push(fakeCard({tags: [Tag.MICROBE, Tag.JOVIAN]}));
    player2.playedCards.push(fakeCard({tags: [Tag.JOVIAN, Tag.JOVIAN]}));
    const microbeCard = new RegolithEaters();
    player.playedCards.push(microbeCard);

    cast(card.play(player), undefined);
    runAllActions(game);

    // Only one eligible microbe-resource card, so it's auto-selected: 1 (this card) +
    // 1 (player's own other Jovian card) + 2 (player2's) = 4.
    expect(microbeCard.resourceCount).to.eq(4);
  });

  it('offers a choice among multiple microbe-resource cards', () => {
    const microbeCard1 = new RegolithEaters();
    const microbeCard2 = new Tardigrades();
    player.playedCards.push(microbeCard1, microbeCard2);

    cast(card.play(player), undefined);
    runAllActions(game);

    const action = cast(player.popWaitingFor(), SelectCard<ICard>);
    action.cb([microbeCard2]);

    // 1 Jovian tag total (this card only) added to the chosen card.
    expect(microbeCard2.resourceCount).to.eq(1);
    expect(microbeCard1.resourceCount).to.eq(0);
  });

  it('is worth 2 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(2);
  });

  it('costs 23 M€', () => {
    expect(card.cost).to.eq(23);
  });
});
