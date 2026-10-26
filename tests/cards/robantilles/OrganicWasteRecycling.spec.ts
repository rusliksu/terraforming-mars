import {expect} from 'chai';
import {OrganicWasteRecycling} from '../../../src/server/cards/robantilles/OrganicWasteRecycling';
import {Ants} from '../../../src/server/cards/base/Ants';
import {EarthOffice} from '../../../src/server/cards/base/EarthOffice';
import {IProjectCard} from '../../../src/server/cards/IProjectCard';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {addCity} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {SerializedCard} from '../../../src/server/SerializedCard';
import {CardName} from '../../../src/common/cards/CardName';

describe('OrganicWasteRecycling', () => {
  let card: OrganicWasteRecycling;
  let player: TestPlayer;

  beforeEach(() => {
    card = new OrganicWasteRecycling();
    [/* game */, player] = testGame(1);
    player.playedCards.push(card);
    addCity(player);
    addCity(player); // Player owns 2 cities.
  });

  it('cannot act without a hosted card or a Microbe/Plant card in hand', () => {
    expect(card.canAct(player)).is.false;

    player.cardsInHand.push(new EarthOffice()); // Not a Microbe or Plant card.
    expect(card.canAct(player)).is.false;

    player.cardsInHand.push(new Ants());
    expect(card.canAct(player)).is.true;
  });

  it('hosts a Microbe or Plant card and stores resources equal to cities owned', () => {
    const ants = new Ants();
    player.cardsInHand.push(ants);

    const action = cast(card.action(player), OrOptions);
    action.options[0].cb([cast(action.options[0], SelectCard<IProjectCard>).cards[0]]);

    expect(card.targetCards).has.lengthOf(1);
    expect(card.targetCards[0].resourceCount).eq(2);
    expect(player.cardsInHand).is.empty;

    // Playing the hosted card from hand should cost 2 M€ less.
    expect(card.getCardDiscount(player, ants)).eq(2);
  });

  it('adds more resources to an already-hosted card', () => {
    const ants = new Ants();
    ants.resourceCount = 2;
    card.targetCards.push(ants);

    const action = cast(card.action(player), OrOptions);
    action.options[0].cb([cast(action.options[0], SelectCard<IProjectCard>).cards[0]]);

    expect(ants.resourceCount).eq(4);
  });

  it('serialization', () => {
    const ants = new Ants();
    ants.resourceCount = 3;
    card.targetCards.push(ants);

    const serialized: SerializedCard = {name: CardName.ORGANIC_WASTE_RECYCLING};
    card.serialize(serialized);
    expect(serialized.targetCards).has.lengthOf(1);
    expect(serialized.targetCards![0].resourceCount).eq(3);

    const deserialized = new OrganicWasteRecycling();
    deserialized.deserialize(serialized);
    expect(deserialized.targetCards).has.lengthOf(1);
    expect(deserialized.targetCards[0].name).eq(CardName.ANTS);
    expect(deserialized.targetCards[0].resourceCount).eq(3);
  });

  it('scores 1 VP per 2 Microbe tags', () => {
    player.tagsForTest = {microbe: 3};
    expect(card.getVictoryPoints(player)).eq(1);
  });
});
