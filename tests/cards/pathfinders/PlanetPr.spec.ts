import {expect} from 'chai';
import {PlanetPr} from '../../../src/server/cards/pathfinders/PlanetPr';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {DeclareCloneTag} from '../../../src/server/pathfinders/DeclareCloneTag';
import {PathfindersExpansion} from '../../../src/server/pathfinders/PathfindersExpansion';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {Tag} from '../../../src/common/cards/Tag';
import {cast} from '../../../src/common/utils/utils';
import {fakeCard, runAllActions} from '../../TestingUtils';

describe('PlanetPr', () => {
  let card: PlanetPr;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new PlanetPr();
    [game, player] = testGame(1, {pathfindersExpansion: true, venusNextExtension: true});
    player.playedCards.push(card);
  });

  it('starts with a clone tag', () => {
    expect(card.tags).deep.eq([Tag.CLONE]);
  });

  it('starts with 40 M€ and no other resources', () => {
    const [freshGame, freshPlayer] = testGame(1, {pathfindersExpansion: true});
    const freshCard = new PlanetPr();
    freshPlayer.playCorporationCard(freshCard);
    runAllActions(freshGame);

    expect(freshPlayer.megaCredits).to.eq(40);
    expect(freshPlayer.steel).to.eq(0);
    expect(freshPlayer.titanium).to.eq(0);
  });

  it('initialAction declares a tag and draws a matching card', () => {
    const cardsBefore = player.cardsInHand.length;

    card.initialAction(player);

    const action = cast(game.deferredActions.pop(), DeclareCloneTag);
    const options = cast(action.execute(), OrOptions);
    // [venus, earth, mars, jovian] are available (no moon expansion here).
    const marsOption = options.options.find((o) => o.title.toString().match(/mars/i));
    marsOption!.cb();
    runAllActions(game);

    expect(card.tags).deep.eq([Tag.MARS]);
    expect(player.cardsInHand.length).to.eq(cardsBefore + 1);
    expect(player.cardsInHand[player.cardsInHand.length - 1].tags).to.include(Tag.MARS);
  });

  it('declaring the clone tag itself counts as a planetary tag play for the streak bonus', () => {
    // Play an Earth-tagged card first...
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.EARTH]}));
    expect(game.pathfindersData!.earth).to.eq(1);

    // ...then declare the corp's own clone tag as Earth too - DeclareCloneTag calls
    // player.onCardPlayed(this.card) once the tag is set, so Planet PR's own (now-Earth)
    // tag registers as the second Earth play in a row and earns the streak bonus.
    card.initialAction(player);
    const action = cast(game.deferredActions.pop(), DeclareCloneTag);
    const options = cast(action.execute(), OrOptions);
    const earthOption = options.options.find((o) => o.title.toString().match(/earth/i));
    earthOption!.cb();
    runAllActions(game);

    expect(card.tags).deep.eq([Tag.EARTH]);
    expect(game.pathfindersData!.earth).to.eq(3); // 1 (prelude) + 2 (corp declaration, streak bonus)
  });

  it('a single planetary tag play raises the track by just 1 step', () => {
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.MARS]}));

    expect(game.pathfindersData!.mars).to.eq(1);
    expect(card.lastPlanetaryTag).to.eq(Tag.MARS);
  });

  it('two of the same planetary tag in a row raises the track 1 extra step on the second one', () => {
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.MARS]}));
    expect(game.pathfindersData!.mars).to.eq(1);

    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.MARS]}));
    expect(game.pathfindersData!.mars).to.eq(3); // +2 instead of +1
  });

  it('a different tag in between breaks the streak - no bonus', () => {
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.MARS]})); // mars: +1
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.EARTH]})); // earth: +1
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.MARS]})); // mars: +1 again, no bonus (Earth broke the streak)

    expect(game.pathfindersData!.mars).to.eq(2);
    expect(game.pathfindersData!.earth).to.eq(1);
  });

  it('a non-planetary tag in between also breaks the streak - no bonus', () => {
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.EARTH]})); // earth: +1
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.PLANT]})); // no planetary tag - breaks the streak
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.EARTH]})); // earth: +1 again, no bonus

    expect(game.pathfindersData!.earth).to.eq(2);
    expect(card.lastPlanetaryTag).to.eq(Tag.EARTH);
  });

  it('a card with no tags at all also breaks the streak', () => {
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.EARTH]})); // earth: +1
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: []}));
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.EARTH]})); // earth: +1 again, no bonus

    expect(game.pathfindersData!.earth).to.eq(2);
  });

  it('does not grant the bonus for a player without Planet PR', () => {
    const [otherGame, otherPlayer] = testGame(1, {pathfindersExpansion: true});

    PathfindersExpansion.onCardPlayed(otherPlayer, fakeCard({tags: [Tag.MARS]}));
    PathfindersExpansion.onCardPlayed(otherPlayer, fakeCard({tags: [Tag.MARS]}));

    expect(otherGame.pathfindersData!.mars).to.eq(2); // plain 1 + 1, no bonus
  });

  it('grants 2 M€ when triggering the Earth track bonus (space 3, nothing crossed before it)', () => {
    player.megaCredits = 0;
    PathfindersExpansion.raiseTrack(Tag.EARTH, player, 3);

    expect(game.pathfindersData!.earth).to.eq(3);
    expect(player.megaCredits).to.eq(2);
  });

  it('grants 1 steel when triggering the Mars track bonus (space 5, starting past space 2)', () => {
    game.pathfindersData!.mars = 3;
    player.steel = 0;
    // Space 5 grants 1 steel via its own "everyone" reward (solo game: everyone is just
    // this player) plus 1 more from the Planet PR bonus (steel_production, the other
    // reward there, doesn't touch steel stock).
    PathfindersExpansion.raiseTrack(Tag.MARS, player, 2);

    expect(game.pathfindersData!.mars).to.eq(5);
    expect(player.steel).to.eq(2);
  });

  it('grants 1 titanium when triggering the Jovian track bonus (space 5, starting past space 2)', () => {
    game.pathfindersData!.jovian = 3;
    player.titanium = 0;
    PathfindersExpansion.raiseTrack(Tag.JOVIAN, player, 2);

    expect(game.pathfindersData!.jovian).to.eq(5);
    expect(player.titanium).to.eq(1);
  });

  it('grants the bonus on a space that only has an "everyone" reward, not just "risingPlayer"', () => {
    // Jovian space 2 is `everyone('titanium')` with no risingPlayer reward - that still
    // counts as triggering the track's bonus for Planet PR's own extra titanium.
    game.pathfindersData!.jovian = 1;
    player.titanium = 0;
    PathfindersExpansion.raiseTrack(Tag.JOVIAN, player, 1);

    expect(game.pathfindersData!.jovian).to.eq(2);
    // 1 from the track's own everyone('titanium') + 1 from Planet PR's bonus.
    expect(player.titanium).to.eq(2);
  });

  it('does not grant a bonus when the raise lands on an empty space', () => {
    game.pathfindersData!.mars = 2;
    player.steel = 0;
    PathfindersExpansion.raiseTrack(Tag.MARS, player, 2);

    expect(game.pathfindersData!.mars).to.eq(4);
    expect(player.steel).to.eq(0);
  });
});
