import {expect} from 'chai';
import {ImmigrationBureau} from '../../../src/server/cards/solaris/ImmigrationBureau';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, forcePartiesInPlay, fakeCard} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {SelectParty} from '../../../src/server/inputs/SelectParty';
import {cast} from '../../../src/common/utils/utils';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';
import {CardType} from '../../../src/common/cards/CardType';
import {Tag} from '../../../src/common/cards/Tag';

describe('ImmigrationBureau', () => {
  let card: ImmigrationBureau;
  let game: IGame;
  let player: TestPlayer;

  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.POPULISTS, PartyName.MARS);
    card = new ImmigrationBureau();
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without Populists ruling or 2 delegates', () => {
    expect(card.canPlay(player)).is.false;
    setRulingParty(game, PartyName.POPULISTS);
    expect(card.canPlay(player)).is.true;
  });

  it('gains 3 M€ and sends a delegate when an Earth event is played', () => {
    setRulingParty(game, PartyName.POPULISTS);
    const turmoil = Turmoil.getTurmoil(game);
    const earthEvent = fakeCard({type: CardType.EVENT, tags: [Tag.EARTH]});
    const megaCreditsBefore = player.megaCredits;
    const delegatesBefore = player.totalDelegatesPlaced;

    const selectParty = cast(card.onCardPlayed(player, earthEvent), SelectParty);
    const chosenParty = selectParty.parties[0];
    selectParty.cb(chosenParty);

    expect(player.megaCredits).to.eq(megaCreditsBefore + 3);
    expect(player.totalDelegatesPlaced).to.eq(delegatesBefore + 1);
    expect(turmoil.getPartyByName(chosenParty).delegates.count(player)).to.be.greaterThan(0);
  });

  it('does not trigger for a non-Event Earth-tagged card', () => {
    const buildingAutomated = fakeCard({type: CardType.AUTOMATED, tags: [Tag.EARTH]});
    const megaCreditsBefore = player.megaCredits;
    const result = card.onCardPlayed(player, buildingAutomated);
    expect(result).is.undefined;
    expect(player.megaCredits).to.eq(megaCreditsBefore);
  });

  it('does not trigger for a non-Earth event', () => {
    const otherEvent = fakeCard({type: CardType.EVENT, tags: []});
    const megaCreditsBefore = player.megaCredits;
    const result = card.onCardPlayed(player, otherEvent);
    expect(result).is.undefined;
    expect(player.megaCredits).to.eq(megaCreditsBefore);
  });
});
