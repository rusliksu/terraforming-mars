import {expect} from 'chai';
import {PartyName} from '../../src/common/turmoil/PartyName';
import {Turmoil} from '../../src/server/turmoil/Turmoil';
import {GameCards} from '../../src/server/GameCards';
import {CardName} from '../../src/common/cards/CardName';
import {DEFAULT_GAME_OPTIONS, GameOptions} from '../../src/server/game/GameOptions';
import {toName} from '../../src/common/utils/utils';
import {testGame} from '../TestGame';
import {forcePartiesInPlay} from '../TestingUtils';

// Populists, Spome, Empower, Bureaucrats, Centrists and Transhumanists are placeholder Turmoil
// parties added for idesOfMars/robAntilles cards that reference them. They're gated behind
// their own "More Parties" fan expansion rather than idesOfMars/robAntilles directly, and any
// card that requires one of them is registered as needing moreParties too, so a game can't end
// up with a card whose required party doesn't exist.
describe('More Parties expansion', () => {
  for (const moonExpansion of [false, true]) {
    it(`selects Spome only with the Moon enabled (moon=${moonExpansion})`, () => {
      const restore = forcePartiesInPlay(PartyName.SPOME);
      try {
        const [game] = testGame(2, {turmoilExtension: true, morePartiesExpansion: true, moonExpansion});
        const names = Turmoil.getTurmoil(game).parties.map(toName);
        expect(names).has.length(6);
        expect(new Set(names).size).to.eq(6);
        expect(names.includes(PartyName.SPOME)).to.eq(moonExpansion);
      } finally {
        restore();
      }
    });
  }

  it('without morePartiesExpansion, only the 6 official parties exist', () => {
    const [game] = testGame(1, {turmoilExtension: true, idesOfMarsExpansion: true, robAntillesExpansion: true});
    const names = Turmoil.getTurmoil(game).parties.map((p) => p.name);
    expect(names).to.have.members([
      PartyName.MARS, PartyName.SCIENTISTS, PartyName.UNITY,
      PartyName.GREENS, PartyName.REDS, PartyName.KELVINISTS,
    ]);
  });

  it('with morePartiesExpansion, exactly 6 of the 12 available parties are chosen at random', () => {
    // Random selection, so run several games and check invariants rather than an exact set:
    // every game has exactly 6 distinct parties, and over enough trials a placeholder party
    // shows up at least once (astronomically unlikely to fail by chance: ~50% per trial per
    // placeholder, so a false negative across 30 trials is effectively impossible).
    const seenAcrossTrials = new Set<PartyName>();
    for (let i = 0; i < 30; i++) {
      const [game] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
      const names = Turmoil.getTurmoil(game).parties.map((p) => p.name);
      expect(names.length).to.eq(6);
      expect(new Set(names).size).to.eq(6);
      names.forEach((name) => seenAcrossTrials.add(name));
    }
    const placeholders = [
      PartyName.POPULISTS, PartyName.SPOME, PartyName.EMPOWER,
      PartyName.BUREAUCRATS, PartyName.CENTRISTS, PartyName.TRANSHUMANISTS,
    ];
    expect(placeholders.some((name) => seenAcrossTrials.has(name))).to.be.true;
  });

  it('reloading a serialized game keeps the same randomly-chosen parties, does not re-roll them', () => {
    const [game] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
    const turmoil = Turmoil.getTurmoil(game);
    const originalNames = turmoil.parties.map((p) => p.name).sort();

    const serialized = JSON.parse(JSON.stringify(turmoil.serialize()));
    const reloaded = Turmoil.deserialize(serialized, [...game.players], game.gameOptions);

    expect(reloaded.parties.map((p) => p.name).sort()).to.deep.eq(originalNames);
  });

  it('cards requiring a placeholder party are excluded unless moreParties is also enabled', () => {
    const withoutMoreParties: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      turmoilExtension: true,
      idesOfMarsExpansion: true,
      robAntillesExpansion: true,
      morePartiesExpansion: false,
    };
    let pool = new GameCards(withoutMoreParties).getProjectCards().map(toName);
    expect(pool).to.not.contain(CardName.TERRAFORMING_OFFICE);
    expect(pool).to.not.contain(CardName.TAX_THE_RICH);

    const withMoreParties: GameOptions = {
      ...withoutMoreParties,
      morePartiesExpansion: true,
    };
    pool = new GameCards(withMoreParties).getProjectCards().map(toName);
    expect(pool).to.contain(CardName.TERRAFORMING_OFFICE);
    expect(pool).to.contain(CardName.TAX_THE_RICH);
  });
});
