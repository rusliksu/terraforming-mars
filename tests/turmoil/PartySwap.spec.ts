import {expect} from 'chai';
import {PartyName} from '../../src/common/turmoil/PartyName';
import {IGame} from '../../src/server/IGame';
import {Turmoil, MORE_PARTIES_ALL} from '../../src/server/turmoil/Turmoil';
import {IGlobalEvent} from '../../src/server/turmoil/globalEvents/IGlobalEvent';
import {GlobalEventName} from '../../src/common/turmoil/globalEvents/GlobalEventName';
import {TestPlayer} from '../TestPlayer';
import {testGame} from '../TestGame';
import {forcePartiesInPlay} from '../TestingUtils';
import {PoliticalAgendas} from '../../src/server/turmoil/PoliticalAgendas';
import {CardRenderer} from '../../src/server/cards/render/CardRenderer';

// More Parties (fan): when a Global Event references a party that isn't among the game's 6
// currently-active parties, Turmoil.swapInParty (private, exercised here via the public
// endGeneration() -> addNeutralDelegate() path) replaces the currently-active party with the
// fewest delegates -- ties broken by leftmost board position -- rather than silently skipping
// the delegate award (the old behavior, still used outside moreParties games).
describe('More Parties: party swap', () => {
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;
  let turmoil: Turmoil;

  const SIX_OFFICIAL = [PartyName.MARS, PartyName.SCIENTISTS, PartyName.UNITY, PartyName.GREENS, PartyName.REDS, PartyName.KELVINISTS];

  function fakeEvent(currentDelegate: PartyName): IGlobalEvent {
    return {
      name: GlobalEventName.RIOTS,
      description: 'test event',
      revealedDelegate: currentDelegate,
      currentDelegate,
      renderData: CardRenderer.builder((b) => b.empty()),
      resolve: () => {},
    };
  }

  beforeEach(() => {
    [game, player, player2] = testGame(2, {turmoilExtension: true, morePartiesExpansion: true, moonExpansion: true});
    turmoil = Turmoil.getTurmoil(game);
    turmoil.parties = SIX_OFFICIAL.map((name) => new MORE_PARTIES_ALL[name]());
    turmoil.parties.forEach((party) => party.delegates.clear());
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.MARS);
    turmoil.dominantParty = turmoil.getPartyByName(PartyName.MARS);
    turmoil.politicalAgendasData = PoliticalAgendas.newInstance('Standard', turmoil.parties);
    turmoil.delegateReserve.clear();
    turmoil.delegateReserve.add('NEUTRAL', 20);
    turmoil.delegateReserve.add(player, 5);
    // endGeneration() also draws its own new distant event from the real deck and processes its
    // revealedDelegate the same way -- empty the deck so that draw is always undefined (a no-op)
    // and doesn't trigger a second, uncontrolled swap on top of the one each test sets up via
    // fakeEvent()/comingGlobalEvent.
    turmoil.globalEventDealer.deck.length = 0;
    turmoil.delegateReserve.add(player2, 5);
  });

  it('replaces the party with the fewest delegates when the referenced party is not in play', () => {
    // Scientists (index 1) has 1 delegate; everyone else (besides Mars, the ruling party) has 0.
    turmoil.sendDelegateToParty('NEUTRAL', PartyName.SCIENTISTS, game);

    turmoil.comingGlobalEvent = fakeEvent(PartyName.TRANSHUMANISTS);
    turmoil.endGeneration(game);

    const names = turmoil.parties.map((p) => p.name);
    expect(names).to.include(PartyName.TRANSHUMANISTS);
    // Unity (index 2, leftmost among the untouched 0-delegate, non-ruling parties) got replaced,
    // not Scientists (which has a delegate) and not Mars (the ruling party, excluded even though
    // tied at 0 with the others).
    expect(names).to.not.include(PartyName.UNITY);
    expect(names).to.include(PartyName.MARS);
    expect(names).to.include(PartyName.SCIENTISTS);
  });

  it('breaks ties by leftmost board position', () => {
    // Mars is ruling (excluded). Scientists, Unity, Greens, Reds, Kelvinists are all tied at 0 --
    // Scientists (index 1) is the leftmost eligible candidate.
    turmoil.comingGlobalEvent = fakeEvent(PartyName.EMPOWER);
    turmoil.endGeneration(game);

    const names = turmoil.parties.map((p) => p.name);
    expect(names).to.not.include(PartyName.SCIENTISTS);
    expect(names).to.include(PartyName.EMPOWER);
    expect(names).to.include(PartyName.MARS);
  });

  it('never replaces the ruling or dominant party even at a 0-delegate tie', () => {
    turmoil.comingGlobalEvent = fakeEvent(PartyName.BUREAUCRATS);
    turmoil.endGeneration(game);

    const names = turmoil.parties.map((p) => p.name);
    expect(names).to.include(PartyName.MARS);
  });

  it('returns the outgoing party delegates to the reserve', () => {
    const unity = turmoil.getPartyByName(PartyName.UNITY);
    // Mars gets the most delegates so it legitimately stays ruling/dominant through
    // endGeneration()'s real recalculation (rather than relying on the beforeEach's static
    // field assignment, which endGeneration's setRulingParty()/checkDominantParty() would
    // otherwise override once another party genuinely has more delegates). Unity gets exactly
    // 1 (the one we'll check gets reclaimed); every other non-ruling party gets 2, so Unity is
    // unambiguously "fewest" among the eligible candidates without being at an empty 0.
    turmoil.sendDelegateToParty('NEUTRAL', PartyName.MARS, game);
    turmoil.sendDelegateToParty('NEUTRAL', PartyName.MARS, game);
    turmoil.sendDelegateToParty('NEUTRAL', PartyName.MARS, game);
    turmoil.sendDelegateToParty(player, PartyName.UNITY, game);
    turmoil.sendDelegateToParty('NEUTRAL', PartyName.SCIENTISTS, game);
    turmoil.sendDelegateToParty('NEUTRAL', PartyName.SCIENTISTS, game);
    turmoil.sendDelegateToParty('NEUTRAL', PartyName.GREENS, game);
    turmoil.sendDelegateToParty('NEUTRAL', PartyName.GREENS, game);
    turmoil.sendDelegateToParty('NEUTRAL', PartyName.REDS, game);
    turmoil.sendDelegateToParty('NEUTRAL', PartyName.REDS, game);
    turmoil.sendDelegateToParty('NEUTRAL', PartyName.KELVINISTS, game);
    turmoil.sendDelegateToParty('NEUTRAL', PartyName.KELVINISTS, game);
    turmoil.rulingParty = turmoil.getPartyByName(PartyName.MARS);
    turmoil.dominantParty = turmoil.getPartyByName(PartyName.MARS);
    const reserveBefore = turmoil.delegateReserve.count(player);

    turmoil.comingGlobalEvent = fakeEvent(PartyName.CENTRISTS);
    turmoil.endGeneration(game);

    expect(turmoil.parties.map((p) => p.name)).to.not.include(PartyName.UNITY);
    expect(turmoil.delegateReserve.count(player)).to.eq(reserveBefore + 1);
    expect(unity.delegates.size).to.eq(0);
  });

  it('gives the swapped-in party a valid political agenda (no throw when it becomes ruling/dominant)', () => {
    turmoil.comingGlobalEvent = fakeEvent(PartyName.SPOME);
    turmoil.endGeneration(game);

    expect(() => PoliticalAgendas.getAgenda(turmoil, PartyName.SPOME)).to.not.throw();
  });

  it('does not introduce Spome through an event without the Moon', () => {
    const restore = forcePartiesInPlay(...SIX_OFFICIAL);
    try {
      const [noMoonGame] = testGame(2, {turmoilExtension: true, morePartiesExpansion: true});
      const noMoonTurmoil = Turmoil.getTurmoil(noMoonGame);
      noMoonTurmoil.globalEventDealer.deck.length = 0;
      noMoonTurmoil.comingGlobalEvent = fakeEvent(PartyName.SPOME);

      noMoonTurmoil.endGeneration(noMoonGame);

      expect(noMoonTurmoil.parties.map((p) => p.name)).to.have.members(SIX_OFFICIAL);
    } finally {
      restore();
    }
  });

  it('does not swap in a non-moreParties game', () => {
    [game, player, player2] = testGame(2, {turmoilExtension: true});
    turmoil = Turmoil.getTurmoil(game);
    const before = turmoil.parties.map((p) => p.name);

    turmoil.comingGlobalEvent = fakeEvent(PartyName.SPOME);
    turmoil.endGeneration(game);

    expect(turmoil.parties.map((p) => p.name)).to.deep.eq(before);
  });
});
