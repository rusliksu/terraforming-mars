import {expect} from 'chai';
import {GameCards} from '../../src/server/GameCards';
import {CardName} from '../../src/common/cards/CardName';
import {DEFAULT_GAME_OPTIONS, GameOptions} from '../../src/server/game/GameOptions';
import {toName} from '../../src/common/utils/utils';

// Corporate Betterments, Ides of Mars and Rob Antilles each shipped a card that turned out to
// be a near-exact mechanical duplicate of an existing sillyfication card (same resource type,
// same trigger, same VP scaling). Rather than deleting the fan-expansion card outright (it
// should still work standalone), it's registered as a conditional replacement: if
// sillyfication is also enabled, sillyfication's version wins and the newer one is dropped from
// the deck, mirroring the BetterMars replacement pattern in Replacements.spec.ts.
describe('sillyfication cross-module replacements', () => {
  it('Amphibians (Ides of Mars) is removed when sillyfication is also active', () => {
    const withoutSilly: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      idesOfMarsExpansion: true,
      sillyficationExpansion: false,
    };
    let pool = new GameCards(withoutSilly).getProjectCards().map(toName);
    expect(pool).to.contain(CardName.AMPHIBIANS_IOM);

    const withSilly: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      idesOfMarsExpansion: true,
      sillyficationExpansion: true,
    };
    pool = new GameCards(withSilly).getProjectCards().map(toName);
    expect(pool).to.not.contain(CardName.AMPHIBIANS_IOM);
    expect(pool).to.contain(CardName.AMPHIBIANS);
  });

  it('Dogs in Space (Rob Antilles) is removed when sillyfication is also active', () => {
    const withoutSilly: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      robAntillesExpansion: true,
      sillyficationExpansion: false,
    };
    let pool = new GameCards(withoutSilly).getProjectCards().map(toName);
    expect(pool).to.contain(CardName.DOGS_IN_SPACE);

    const withSilly: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      robAntillesExpansion: true,
      sillyficationExpansion: true,
    };
    pool = new GameCards(withSilly).getProjectCards().map(toName);
    expect(pool).to.not.contain(CardName.DOGS_IN_SPACE);
    expect(pool).to.contain(CardName.URANUS_SEA_CREATURES);
  });

  it('Mobile Biological Dome (Rob Antilles) is removed when sillyfication is also active', () => {
    // Both Mobile Biological Dome and Evergreen Forest require Turmoil directly (the former
    // via the Spome party it references, the latter via its own compatibility), so unlike the
    // Amphibians/Dogs in Space cases above, Turmoil must be on for either card to appear at all.
    const withoutSilly: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      robAntillesExpansion: true,
      morePartiesExpansion: true,
      turmoilExtension: true,
      sillyficationExpansion: false,
    };
    let pool = new GameCards(withoutSilly).getProjectCards().map(toName);
    expect(pool).to.contain(CardName.MOBILE_BIOLOGICAL_DOME);

    const withSilly: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      robAntillesExpansion: true,
      morePartiesExpansion: true,
      turmoilExtension: true,
      sillyficationExpansion: true,
    };
    pool = new GameCards(withSilly).getProjectCards().map(toName);
    expect(pool).to.not.contain(CardName.MOBILE_BIOLOGICAL_DOME);
    expect(pool).to.contain(CardName.EVERGREEN_FOREST);
  });

  it('Rob Antilles and Ides of Mars cards stay when sillyfication is not enabled', () => {
    const gameOptions: GameOptions = {
      ...DEFAULT_GAME_OPTIONS,
      corporateEra: true,
      idesOfMarsExpansion: true,
      robAntillesExpansion: true,
      morePartiesExpansion: true,
      turmoilExtension: true,
      sillyficationExpansion: false,
    };
    const pool = new GameCards(gameOptions).getProjectCards().map(toName);
    expect(pool).to.contain(CardName.AMPHIBIANS_IOM);
    expect(pool).to.contain(CardName.DOGS_IN_SPACE);
    expect(pool).to.contain(CardName.MOBILE_BIOLOGICAL_DOME);
  });
});
