import {expect} from 'chai';
import {DeimosDoubleDownCopy} from '../../../src/server/cards/sillyfication/DeimosDoubleDownCopy';
import {Comet} from '../../../src/server/cards/base/Comet';
import {NitrogenRichAsteroid} from '../../../src/server/cards/base/NitrogenRichAsteroid';
import {GiantIceAsteroid} from '../../../src/server/cards/base/GiantIceAsteroid';
import {CardName} from '../../../src/common/cards/CardName';
import {Tag} from '../../../src/common/cards/Tag';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {SerializedCard} from '../../../src/server/SerializedCard';
import {serializeCard, deserializeCard} from '../../../src/server/cards/cardSerialization';

describe('DeimosDoubleDownCopy', () => {
  let player: TestPlayer;

  beforeEach(() => {
    [/* game */, player] = testGame(1);
  });

  it('has a distinct name from whatever it copies', () => {
    const copy = new DeimosDoubleDownCopy(CardName.COMET);
    expect(copy.name).to.not.eq(CardName.COMET);
  });

  it('delegates tags, cost, and type from a simple behavior-only card (Comet)', () => {
    const copy = new DeimosDoubleDownCopy(CardName.COMET);
    const original = new Comet();

    expect(copy.tags).to.deep.eq(original.tags);
    expect(copy.cost).to.eq(original.cost);
    expect(copy.type).to.eq(original.type);
    expect(copy.tags).to.deep.eq([Tag.SPACE]);
  });

  it('plays identically to the real card for a simple behavior-only source (Comet)', () => {
    const copy = new DeimosDoubleDownCopy(CardName.COMET);
    player.megaCredits = 100;
    const temperatureBefore = player.game.getTemperature();

    copy.play(player);

    expect(player.game.getTemperature()).to.eq(temperatureBefore + 2); // Comet raises 1 step (2 degrees)
  });

  it('plays identically to the real card for a card with bespoke play logic (NitrogenRichAsteroid)', () => {
    const copy = new DeimosDoubleDownCopy(CardName.NITROGEN_RICH_ASTEROID);
    player.megaCredits = 100;
    player.production.override({plants: 0});
    player.tagsForTest = {plant: 0};

    copy.play(player);

    // Fewer than 3 plant tags -> +1 plant production, exactly like the real card.
    expect(player.production.plants).to.eq(1);
  });

  it('canPlay matches the real card\'s own canPlay result', () => {
    const copy = new DeimosDoubleDownCopy(CardName.COMET);
    const original = new Comet();
    expect(copy.canPlay(player)).to.eq(original.canPlay(player));
  });

  it('round-trips sourceCardName through serialize/deserialize', () => {
    const copy = new DeimosDoubleDownCopy(CardName.NITROGEN_RICH_ASTEROID);
    const serialized: SerializedCard = {name: copy.name};
    copy.serialize(serialized);

    const restored = new DeimosDoubleDownCopy();
    restored.deserialize(serialized);

    expect(restored.sourceCardName).to.eq(CardName.NITROGEN_RICH_ASTEROID);
    expect(restored.tags).to.deep.eq(new NitrogenRichAsteroid().tags);
  });

  it('survives a full save/load round trip through the real manifest lookup', () => {
    const copy = new DeimosDoubleDownCopy(CardName.NITROGEN_RICH_ASTEROID);
    copy.resourceCount = 2;

    const serialized = serializeCard(copy);
    expect(serialized.name).to.eq(CardName.DEIMOS_DOUBLE_DOWN_COPY);

    const restored = deserializeCard(serialized);
    expect(restored).to.be.instanceOf(DeimosDoubleDownCopy);
    expect((restored as DeimosDoubleDownCopy).sourceCardName).to.eq(CardName.NITROGEN_RICH_ASTEROID);
    expect(restored.resourceCount).to.eq(2);
    expect(restored.tags).to.deep.eq(new NitrogenRichAsteroid().tags);
  });

  it('does not throw when checked for playability - additionalProjectCosts must be a real settable field', () => {
    // Regression: getPlayableCards/canPlay unconditionally do
    // `card.additionalProjectCosts = undefined` for every card in hand, every time. A
    // getter-only delegate threw "Cannot set property... which only has a getter" the
    // moment a copy (e.g. of Giant Ice Asteroid) was sitting in hand.
    const copy = new DeimosDoubleDownCopy(CardName.GIANT_ICE_ASTEROID);
    player.megaCredits = 100;
    player.cardsInHand = [copy];

    expect(() => player.getPlayableCards()).to.not.throw();
    expect(player.getPlayableCards()).to.include(copy);
    expect(copy.tags).to.deep.eq(new GiantIceAsteroid().tags);
  });

  it('resourceCount and warnings are independent, own state, not delegated', () => {
    const copy = new DeimosDoubleDownCopy(CardName.COMET);
    copy.resourceCount = 3;
    expect(copy.resourceCount).to.eq(3);
    expect(new Comet().resourceCount).to.eq(0);
  });
});
