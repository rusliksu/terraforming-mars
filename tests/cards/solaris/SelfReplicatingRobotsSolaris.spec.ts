import {expect} from 'chai';
import {SelfReplicatingRobotsSolaris} from '../../../src/server/cards/solaris/SelfReplicatingRobotsSolaris';
import {IGame} from '../../../src/server/IGame';
import {IProjectCard} from '../../../src/server/cards/IProjectCard';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {SelectOption} from '../../../src/server/inputs/SelectOption';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {fakeCard, runAllActions} from '../../TestingUtils';
import {Tag} from '../../../src/common/cards/Tag';
import {CardName} from '../../../src/common/cards/CardName';
import {SerializedCard} from '../../../src/server/SerializedCard';
import {cast} from '../../../src/common/utils/utils';

describe('SelfReplicatingRobotsSolaris', () => {
  let card: SelfReplicatingRobotsSolaris;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new SelfReplicatingRobotsSolaris();
    [game, player] = testGame(1);
  });

  it('cannot play without 2 Science tags', () => {
    player.tagsForTest = {science: 1};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 2 Science tags', () => {
    player.tagsForTest = {science: 2};
    expect(card.canPlay(player)).is.true;
  });

  it('reveals cards from the deck, discarding non-matches, until it finds a Space or Building card', () => {
    player.playedCards.push(card);

    const nonMatch = fakeCard({tags: [Tag.PLANT]});
    const match = fakeCard({tags: [Tag.SPACE]});
    // draw() pops from the end, so push in reverse reveal order.
    game.projectDeck.drawPile.push(match, nonMatch);

    const orOptions = cast(card.action(player), OrOptions);
    const reveal = cast(orOptions.options[orOptions.options.length - 1], SelectOption);
    reveal.cb(undefined);
    runAllActions(game);

    expect(card.targetCards).has.lengthOf(1);
    expect(card.targetCards[0].name).eq(match.name);
    expect(card.targetCards[0].resourceCount).to.eq(2);
    expect(game.projectDeck.discardPile.map((c) => c.name)).contains(nonMatch.name);
  });

  it('doubles the resources on a hosted card', () => {
    const hosted: IProjectCard = fakeCard({tags: [Tag.BUILDING]});
    hosted.resourceCount = 2;
    card.targetCards.push(hosted);

    const orOptions = cast(card.action(player), OrOptions);
    const doubleOption = cast(orOptions.options[0], SelectCard<IProjectCard>);
    doubleOption.cb([hosted]);

    expect(hosted.resourceCount).to.eq(4);
  });

  it('discounts the cost of a hosted card by its resource count', () => {
    const hosted: IProjectCard = fakeCard({name: CardName.ASTEROID_MINING, tags: [Tag.SPACE]});
    hosted.resourceCount = 3;
    card.targetCards.push(hosted);

    expect(card.getCardDiscount(player, hosted)).to.eq(3);
  });

  it('serialization', () => {
    const hosted = fakeCard({name: CardName.ASTEROID_MINING});
    hosted.resourceCount = 4;
    card.targetCards.push(hosted);

    const serialized: SerializedCard = {name: CardName.SELF_REPLICATING_ROBOTS_SOLARIS};
    card.serialize(serialized);
    expect(serialized.targetCards).deep.eq([
      {
        card: {name: CardName.ASTEROID_MINING},
        resourceCount: 4,
      },
    ]);

    const deserialized = new SelfReplicatingRobotsSolaris();
    deserialized.deserialize(serialized);
    expect(deserialized.targetCards).has.length(1);
    expect(deserialized.targetCards[0].name).eq(CardName.ASTEROID_MINING);
    expect(deserialized.targetCards[0].resourceCount).eq(4);
  });
});
