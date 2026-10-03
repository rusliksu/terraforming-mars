import {expect} from 'chai';
import {Tag} from '../../src/common/cards/Tag';
import {IPlayer} from '../../src/server/IPlayer';
import {TestPlayer} from '../TestPlayer';
import {Tags} from '../../src/server/player/Tags';
import {fakeCard, testGame} from '../TestingUtils';
import {CardType} from '../../src/common/cards/CardType';
import {CardName} from '../../src/common/cards/CardName';
import {newCard, newProjectCard} from '../../src/server/createCard';
import {GameOptions} from '../../src/server/game/GameOptions';
import {Odyssey} from '../../src/server/cards/pathfinders/Odyssey';

// Exposes rawCount available for testing.
class TestableTags extends Tags {
  constructor(player: IPlayer) {
    super(player);
  }
  public override rawCount(tag: Tag, includeEventsTags: boolean) {
    return super.rawCount(tag, includeEventsTags);
  }
}

describe('Tags', () => {
  let player: IPlayer;
  let tags: TestableTags;

  beforeEach(() => {
    player = TestPlayer.BLACK.newPlayer();
    tags = new TestableTags(player);
  });

  function playFakeCorporation(...tags: Array<Tag>) {
    const card = fakeCard({type: CardType.CORPORATION, tags: tags});
    player.playedCards.push(card);
  }

  function playFakeEvent(...tags: Array<Tag>) {
    const card = fakeCard({type: CardType.EVENT, tags: tags});
    player.playedCards.push(card);
  }

  function playFakeProject(...tags: Array<Tag>) {
    const card = fakeCard({type: CardType.AUTOMATED, tags: tags});
    player.playedCards.push(card);
  }

  // getAllTags
  // count(...)

  const cardHasTagRuns = [
    {card: CardName.MICRO_MILLS, tag: Tag.ANIMAL, expected: false},
    {card: CardName.BIRDS, tag: Tag.ANIMAL, expected: true},
    {card: CardName.BRIBED_COMMITTEE, tag: Tag.EVENT, expected: true},
  ] as const;
  for (const run of cardHasTagRuns) {
    it('cardHasTag ' + JSON.stringify(run), () => {
      expect(tags.cardHasTag(newCard(run.card)!, run.tag)).eq(run.expected);
    });
  }

  it('count ignores event', () => {
    const [_, player] = testGame(1);
    const card = fakeCard({tags: [Tag.JOVIAN]});
    player.playedCards.push(card);

    expect(player.tags.count(Tag.JOVIAN)).eq(1);

    const event = fakeCard({type: CardType.EVENT, tags: [Tag.JOVIAN]});
    player.playedCards.set(event);

    expect(player.tags.count(Tag.JOVIAN)).eq(0);
  });

  it('count and distinctCount for Odyssey', () => {
    const [_, player] = testGame(1);
    const event = fakeCard({type: CardType.EVENT, tags: [Tag.JOVIAN]});
    const nonEvent = fakeCard({tags: [Tag.JOVIAN, Tag.BUILDING]});
    const odyssey = new Odyssey();
    player.playedCards.push(odyssey);
    player.playedCards.push(event);
    player.playedCards.push(nonEvent);

    expect(player.tags.count(Tag.JOVIAN)).eq(2);
    expect(player.tags.distinctCount('default')).eq(3);

    player.playedCards.remove(odyssey);

    expect(player.tags.count(Tag.JOVIAN)).eq(1);
    expect(player.tags.distinctCount('default')).eq(2);
  });

  describe('cardTagCount', () => {
    it('counts a single tag', () => {
      const card = fakeCard({tags: [Tag.SCIENCE, Tag.SCIENCE, Tag.BUILDING]});
      expect(tags.cardTagCount(card, Tag.SCIENCE)).eq(2);
    });

    it('counts an array of tags', () => {
      const card = fakeCard({tags: [Tag.ANIMAL, Tag.PLANT, Tag.MICROBE, Tag.BUILDING]});
      expect(tags.cardTagCount(card, [Tag.ANIMAL, Tag.PLANT, Tag.MICROBE])).eq(3);
    });

    it('Habitat Marte: counts Mars tags as Science, single-tag target', () => {
      player.playedCards.push(newCard(CardName.HABITAT_MARTE)!);
      const card = fakeCard({tags: [Tag.MARS, Tag.SCIENCE, Tag.BUILDING]});
      expect(tags.cardTagCount(card, Tag.SCIENCE)).eq(2);
    });

    it('Habitat Marte: counts Mars tags as Science, array target', () => {
      player.playedCards.push(newCard(CardName.HABITAT_MARTE)!);
      const card = fakeCard({tags: [Tag.MARS, Tag.BUILDING]});
      expect(tags.cardTagCount(card, [Tag.SCIENCE, Tag.EARTH])).eq(1);
    });

    it('without Habitat Marte, Mars tags do not count as Science', () => {
      const card = fakeCard({tags: [Tag.MARS]});
      expect(tags.cardTagCount(card, Tag.SCIENCE)).eq(0);
    });

    it('Nereid Biosystems: counts Jovian tags as Microbe, single-tag target', () => {
      player.playedCards.push(newCard(CardName.NEREID_BIOSYSTEMS)!);
      const card = fakeCard({tags: [Tag.JOVIAN, Tag.MICROBE, Tag.BUILDING]});
      expect(tags.cardTagCount(card, Tag.MICROBE)).eq(2);
    });

    it('Nereid Biosystems: counts Jovian tags as Microbe, array target', () => {
      player.playedCards.push(newCard(CardName.NEREID_BIOSYSTEMS)!);
      const card = fakeCard({tags: [Tag.JOVIAN, Tag.ANIMAL]});
      expect(tags.cardTagCount(card, [Tag.ANIMAL, Tag.PLANT, Tag.MICROBE])).eq(2);
    });

    it('without Nereid Biosystems, Jovian tags do not count as Microbe', () => {
      const card = fakeCard({tags: [Tag.JOVIAN]});
      expect(tags.cardTagCount(card, Tag.MICROBE)).eq(0);
    });
  });

  describe('cardHasTag', () => {
    it('Nereid Biosystems: a Jovian-tagged card counts as having a Microbe tag', () => {
      player.playedCards.push(newCard(CardName.NEREID_BIOSYSTEMS)!);
      const card = fakeCard({tags: [Tag.JOVIAN]});
      expect(tags.cardHasTag(card, Tag.MICROBE)).is.true;
    });

    it('without Nereid Biosystems, a Jovian-tagged card does not count as having a Microbe tag', () => {
      const card = fakeCard({tags: [Tag.JOVIAN]});
      expect(tags.cardHasTag(card, Tag.MICROBE)).is.false;
    });
  });

  // multipleCount

  const tagsInGameRuns: ReadonlyArray<{options: Partial<GameOptions>, expected: number}> = [
    {options: {}, expected: 10},
    {options: {venusNextExtension: true}, expected: 11},
    {options: {coloniesExtension: true}, expected: 10},
    {options: {pathfindersExpansion: true}, expected: 11},
    {options: {venusNextExtension: true, pathfindersExpansion: true}, expected: 12},
    {options: {moonExpansion: true}, expected: 11},
  ] as const;
  for (const run of tagsInGameRuns) {
    it('tagsInGame ' + JSON.stringify(run), () => {
      const [_, player] = testGame(1, run.options);
      expect(player.tags.tagsInGame()).eq(run.expected);
    });
  }

  // distinctCount
  it('distinctCount', () => {
    const [_, player] = testGame(1);
    const tags = player.tags;
    expect(tags.distinctCount('default')).eq(0);
    expect(tags.distinctCount('default', Tag.ANIMAL)).eq(1);

    player.playedCards.push(newProjectCard(CardName.ADAPTATION_TECHNOLOGY)!);
    expect(tags.distinctCount('default')).eq(1);
    expect(tags.distinctCount('default', Tag.ANIMAL)).eq(2);
    expect(tags.distinctCount('default', Tag.SCIENCE)).eq(1);
    // Ignore disabled cards
    // Odyssey special case, events
    // Odyssey special case, event + wild + max
  });

  // playerHas
  it('rawCount', () => {
    expect(tags.rawCount(Tag.BUILDING, false)).eq(0);

    playFakeProject(Tag.BUILDING);

    expect(tags.rawCount(Tag.BUILDING, false)).eq(1);

    playFakeEvent(Tag.BUILDING);

    expect(tags.rawCount(Tag.BUILDING, false)).eq(1);
    expect(tags.rawCount(Tag.BUILDING, true)).eq(2);

    playFakeCorporation(Tag.BUILDING);

    expect(tags.rawCount(Tag.BUILDING, false)).eq(2);
    expect(tags.rawCount(Tag.BUILDING, true)).eq(3);
  });
});
