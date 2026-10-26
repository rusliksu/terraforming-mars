import {expect} from 'chai';
import {PlanetaryOutpost} from '../../../src/server/cards/highOrbit/PlanetaryOutpost';
import {Tag} from '../../../src/common/cards/Tag';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';

describe('PlanetaryOutpost', () => {
  let card: PlanetaryOutpost;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new PlanetaryOutpost();
    [game, player, player2] = testGame(2);
  });

  it('carries the Building tag, not Infrastructure, and has no Space/Infrastructure requirement', () => {
    expect(card.tags).to.include(Tag.BUILDING);
    expect(card.tags).to.not.include(Tag.INFRASTRUCTURE);
    expect(card.canPlay(player)).is.true;
  });

  it('makes the player the first player on play', () => {
    game.overrideFirstPlayer(player2);
    expect(game.first).to.eq(player2);

    card.play(player);

    expect(game.first).to.eq(player);
  });

  it('marks Planetary Outpost as played this generation', () => {
    expect(game.cardsPlayedThisGeneration.has(card.name)).is.false;
    card.play(player);
    expect(game.cardsPlayedThisGeneration.has(card.name)).is.true;
  });

  it('cannot play a second Planetary Outpost in the same generation', () => {
    const card2 = new PlanetaryOutpost();
    player2.tagsForTest = {[Tag.SPACE]: 1};

    card.play(player);

    expect(card2.canPlay(player2)).is.false;
  });

  it('can play again once a new generation starts', () => {
    card.play(player);
    expect(game.cardsPlayedThisGeneration.has(card.name)).is.true;

    game.cardsPlayedThisGeneration.clear();

    const card2 = new PlanetaryOutpost();
    player2.tagsForTest = {[Tag.SPACE]: 1};
    expect(card2.canPlay(player2)).is.true;
  });
});
