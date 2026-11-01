import {expect} from 'chai';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {fakeCard, testGame} from '../../TestingUtils';
import {MARS_FIRST_BONUS_1, MarsFirst} from '../../../src/server/turmoil/parties/MarsFirst';
import {MARS_FIRST_BETTER_MARS_BONUS_1, MarsFirstBetterMars} from '../../../src/server/turmoil/parties/MarsFirstBetterMars';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Tag} from '../../../src/common/cards/Tag';

describe('MarsFirstBetterMars', () => {
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    [game, player] = testGame(2, {turmoilExtension: true, pathfindersExpansion: true, betterMarsExpansion: true});
  });

  it('Ruling bonus 1: Gain 1 M€ for every building and Mars tag you have', () => {
    player.playedCards.push(fakeCard({tags: [Tag.BUILDING]}), fakeCard({tags: [Tag.MARS]}));

    MARS_FIRST_BETTER_MARS_BONUS_1.grant(game);
    expect(player.megaCredits).to.eq(2);
  });

  it('Ruling bonus 1 counts both tags of a card that has both', () => {
    player.playedCards.push(fakeCard({tags: [Tag.BUILDING, Tag.MARS]}));

    MARS_FIRST_BETTER_MARS_BONUS_1.grant(game);
    expect(player.megaCredits).to.eq(2);
  });

  it('keeps the official Mars First policies', () => {
    const party = Turmoil.getTurmoil(game).getPartyByName(PartyName.MARS);
    expect(party).to.be.instanceOf(MarsFirstBetterMars);
    expect(party.policies.map((policy) => policy.id)).to.deep.eq(['mp01', 'mp02', 'mp03', 'mp04']);
  });

  it('uses the official Mars First party when Better Mars is off', () => {
    const [standardGame, standardPlayer] = testGame(2, {turmoilExtension: true});
    standardPlayer.playedCards.push(fakeCard({tags: [Tag.MARS]}));

    expect(Turmoil.getTurmoil(standardGame).getPartyByName(PartyName.MARS)).to.be.instanceOf(MarsFirst);
    MARS_FIRST_BONUS_1.grant(standardGame);
    expect(standardPlayer.megaCredits).to.eq(0);
  });

  it('restores the Better Mars party after deserialization', () => {
    const turmoil = Turmoil.getTurmoil(game);
    const serialized = JSON.parse(JSON.stringify(turmoil.serialize()));
    const reloaded = Turmoil.deserialize(serialized, [...game.players], game.gameOptions);

    expect(reloaded.getPartyByName(PartyName.MARS)).to.be.instanceOf(MarsFirstBetterMars);
  });
});
