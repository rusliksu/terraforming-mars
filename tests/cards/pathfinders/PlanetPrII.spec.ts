import {expect} from 'chai';
import {PlanetPrII} from '../../../src/server/cards/pathfinders/PlanetPrII';
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

describe('PlanetPrII', () => {
  let card: PlanetPrII;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new PlanetPrII();
    [game, player] = testGame(1, {pathfindersExpansion: true});
    player.playedCards.push(card);
  });

  it('starts with a clone tag', () => {
    expect(card.tags).deep.eq([Tag.CLONE]);
  });

  it('starts with 40 M€', () => {
    const [freshGame, freshPlayer] = testGame(1, {pathfindersExpansion: true});
    const freshCard = new PlanetPrII();
    freshPlayer.playCorporationCard(freshCard);
    runAllActions(freshGame);
    expect(freshPlayer.megaCredits).to.eq(40);
  });

  it('initialAction declares a tag and draws a matching card', () => {
    const cardsBefore = player.cardsInHand.length;

    card.initialAction(player);

    const action = cast(game.deferredActions.pop(), DeclareCloneTag);
    const options = cast(action.execute(), OrOptions);
    const marsOption = options.options.find((o) => o.title.toString().match(/mars/i));
    marsOption!.cb();
    runAllActions(game);

    expect(card.tags).deep.eq([Tag.MARS]);
    expect(player.cardsInHand.length).to.eq(cardsBefore + 1);
  });

  it('a single planetary tag play raises the track by just 1 step, no M€', () => {
    player.megaCredits = 0;
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.MARS]}));

    expect(game.pathfindersData!.mars).to.eq(1);
    expect(player.megaCredits).to.eq(0);
  });

  it('two of the same planetary tag in a row raises the track 1 extra step and gives 2 M€', () => {
    player.megaCredits = 0;
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.MARS]}));
    expect(game.pathfindersData!.mars).to.eq(1);
    expect(player.megaCredits).to.eq(0);

    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.MARS]}));
    expect(game.pathfindersData!.mars).to.eq(3); // +2 instead of +1
    expect(player.megaCredits).to.eq(2);
  });

  it('does not grant Planet PR\'s per-track piggyback bonuses', () => {
    player.steel = 0;
    // Mars space 2 is everyone('steel') - its own reward, but no Planet-PR-style extra
    // steel piggybacked on top, since this card doesn't have that ability.
    PathfindersExpansion.raiseTrack(Tag.MARS, player, 2);

    expect(game.pathfindersData!.mars).to.eq(2);
    expect(player.steel).to.eq(1); // just the track's own reward, no piggyback bonus
  });

  it('a non-planetary tag in between breaks the streak - no bonus', () => {
    player.megaCredits = 0;
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.EARTH]}));
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.PLANT]}));
    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.EARTH]}));

    expect(game.pathfindersData!.earth).to.eq(2);
    expect(player.megaCredits).to.eq(0);
  });

  it('sharing the tableau with Planet PR shares one streak, and both bonuses fire', () => {
    const planetPr = new PlanetPr();
    player.playedCards.push(planetPr);
    player.megaCredits = 0;
    player.titanium = 0;

    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.JOVIAN]}));
    expect(game.pathfindersData!.jovian).to.eq(1);

    PathfindersExpansion.onCardPlayed(player, fakeCard({tags: [Tag.JOVIAN]}));
    expect(game.pathfindersData!.jovian).to.eq(3); // streak bonus applies once, not twice
    expect(player.megaCredits).to.eq(2); // Planet PR II's flat bonus
    // Jovian space 2's own everyone('titanium') reward, plus Planet PR's piggyback bonus
    // on top of it - both fire, since crossing space 2 triggers a real track bonus.
    expect(player.titanium).to.eq(2);
  });
});
