import {expect} from 'chai';
import {
  CENTRISTS_BONUS_1,
  CENTRISTS_BONUS_2,
  CENTRISTS_POLICY_1,
  CENTRISTS_POLICY_2,
  CENTRISTS_POLICY_3,
  CENTRISTS_POLICY_4,
} from '../../../src/server/turmoil/parties/Centrists';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, fakeCard} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Tag} from '../../../src/common/cards/Tag';
import {TileType} from '../../../src/common/TileType';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast} from '../../../src/common/utils/utils';

describe('Centrists', () => {
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.CENTRISTS);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('bonus A: scores and grants 1 M€ per distinct tag', () => {
    expect(CENTRISTS_BONUS_1.getScore(player)).to.eq(0);
    player.playedCards.push(fakeCard({tags: [Tag.SPACE, Tag.EARTH]}));
    expect(CENTRISTS_BONUS_1.getScore(player)).to.eq(2);

    const before = player.megaCredits;
    CENTRISTS_BONUS_1.grantForPlayer(player);
    expect(player.megaCredits).to.eq(before + 2);
  });

  it('bonus B: scores and grants 2 M€ per kind of tile', () => {
    expect(CENTRISTS_BONUS_2.getScore(player)).to.eq(0);
    const spaces = game.board.getAvailableSpacesOnLand(player);
    game.addTile(player, spaces[0], {tileType: TileType.CITY});
    expect(CENTRISTS_BONUS_2.getScore(player)).to.eq(1);
    game.addTile(player, spaces[1], {tileType: TileType.GREENERY});
    expect(CENTRISTS_BONUS_2.getScore(player)).to.eq(2);
    game.addTile(player, spaces[2], {tileType: TileType.GREENERY}); // same kind again
    expect(CENTRISTS_BONUS_2.getScore(player)).to.eq(2);

    const before = player.megaCredits;
    CENTRISTS_BONUS_2.grantForPlayer(player);
    expect(player.megaCredits).to.eq(before + 4);
  });

  it('policy 1: pays 1 of each standard resource except M€ for 15 M€', () => {
    player.megaCredits = 0;
    player.steel = 1;
    player.titanium = 1;
    player.plants = 1;
    player.energy = 1;
    player.heat = 1;
    expect(CENTRISTS_POLICY_1.canAct(player)).is.true;
    CENTRISTS_POLICY_1.action(player);
    expect(player.megaCredits).to.eq(15);
    expect(player.steel).to.eq(0);
    expect(player.titanium).to.eq(0);
    expect(player.plants).to.eq(0);
    expect(player.energy).to.eq(0);
    expect(player.heat).to.eq(0);
  });

  it('policy 1 cannot act without at least 1 of each resource', () => {
    player.steel = 0;
    player.titanium = 1;
    player.plants = 1;
    player.energy = 1;
    player.heat = 1;
    expect(CENTRISTS_POLICY_1.canAct(player)).is.false;
  });

  it('policy 2: pays 7 M€ to raise the single lowest production', () => {
    player.megaCredits = 7;
    player.production.override({megacredits: 0, steel: 5, titanium: 5, plants: 5, energy: 5, heat: 5});
    expect(CENTRISTS_POLICY_2.canAct(player)).is.true;
    const result = CENTRISTS_POLICY_2.action(player);
    expect(result).to.be.undefined; // single lowest (M€), resolved directly
    expect(player.megaCredits).to.eq(0);
    expect(player.production.megacredits).to.eq(1);
  });

  it('policy 2: offers a choice when multiple productions are tied for lowest', () => {
    player.megaCredits = 7;
    player.production.override({megacredits: 0, steel: 0, titanium: 5, plants: 5, energy: 5, heat: 5});
    const result = CENTRISTS_POLICY_2.action(player);
    const orOptions = cast(result, OrOptions);
    expect(orOptions.options).to.have.lengthOf(2);
    orOptions.options[0].cb();
    expect(player.megaCredits).to.eq(0);
  });

  it('policy 3: gains 4 M€ when playing a card with a tag not had before', () => {
    const before = player.megaCredits;
    const card = fakeCard({tags: [Tag.SPACE]});
    player.playedCards.push(card);
    CENTRISTS_POLICY_3.onCardPlayed(player, card);
    expect(player.megaCredits).to.eq(before + 4);
  });

  it('policy 3: has no effect when the card only has tags the player already had', () => {
    player.playedCards.push(fakeCard({tags: [Tag.SPACE]}));
    const before = player.megaCredits;
    const card = fakeCard({tags: [Tag.SPACE]});
    player.playedCards.push(card);
    CENTRISTS_POLICY_3.onCardPlayed(player, card);
    expect(player.megaCredits).to.eq(before);
  });

  it('policy 4: offers only tags the player does not have, pays 4 M€ when chosen', () => {
    player.megaCredits = 10;
    expect(CENTRISTS_POLICY_4.canAct(player)).is.true;
    const result = CENTRISTS_POLICY_4.action(player);
    const orOptions = cast(result, OrOptions);
    expect(orOptions.options.length).to.be.greaterThan(0);
    orOptions.options[0].cb();
    game.deferredActions.runAll(() => {});
    expect(player.megaCredits).to.eq(6);
    expect(player.cardsInHand).to.have.lengthOf(1);
  });
});
