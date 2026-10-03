import {expect} from 'chai';
import {GameCards} from '../../../src/server/GameCards';
import {CardName} from '../../../src/common/cards/CardName';
import {DEFAULT_GAME_OPTIONS, GameOptions} from '../../../src/server/game/GameOptions';
import {toName} from '../../../src/common/utils/utils';

describe('Sillyfication module', () => {
  it('only offers Sillyfication cards when sillyficationExpansion is on', () => {
    const off: GameOptions = {...DEFAULT_GAME_OPTIONS, corporateEra: true, preludeExtension: true, sillyficationExpansion: false};
    const on: GameOptions = {...DEFAULT_GAME_OPTIONS, corporateEra: true, preludeExtension: true, sillyficationExpansion: true, pathfindersExpansion: true};

    const offPool = [
      ...new GameCards(off).getProjectCards().map(toName),
      ...new GameCards(off).getPreludeCards().map(toName),
    ];
    const onPool = [
      ...new GameCards(on).getProjectCards().map(toName),
      ...new GameCards(on).getPreludeCards().map(toName),
    ];

    // Formerly Teco cards, now merged into Sillyfication.
    expect(offPool).to.not.contain(CardName.CATS);
    expect(offPool).to.not.contain(CardName.MARS_HOMESTEAD_ACT);
    expect(onPool).to.contain(CardName.CATS);
    expect(onPool).to.contain(CardName.TAG_TAXER);
    expect(onPool).to.contain(CardName.GENEROUS_REDISTRIBUTION);
    expect(onPool).to.contain(CardName.MARS_HOMESTEAD_ACT);

    // Original Sillyfication cards.
    expect(offPool).to.not.contain(CardName.MICRO_CREDITS);
    expect(onPool).to.contain(CardName.MICRO_CREDITS);
  });

  it('only offers Market Crash (a Crime-tagged prelude) when underworldExpansion is on', () => {
    const withoutUnderworld: GameOptions = {...DEFAULT_GAME_OPTIONS, corporateEra: true, preludeExtension: true, sillyficationExpansion: true, underworldExpansion: false};
    const withUnderworld: GameOptions = {...DEFAULT_GAME_OPTIONS, corporateEra: true, preludeExtension: true, sillyficationExpansion: true, underworldExpansion: true};

    expect(new GameCards(withoutUnderworld).getPreludeCards().map(toName)).to.not.contain(CardName.MARKET_CRASH);
    expect(new GameCards(withUnderworld).getPreludeCards().map(toName)).to.contain(CardName.MARKET_CRASH);
  });

  it('only offers Mars Homestead Act (a Mars-tagged prelude) when pathfindersExpansion is also on', () => {
    const withoutPathfinders: GameOptions = {...DEFAULT_GAME_OPTIONS, corporateEra: true, preludeExtension: true, sillyficationExpansion: true, pathfindersExpansion: false};
    const withPathfinders: GameOptions = {...DEFAULT_GAME_OPTIONS, corporateEra: true, preludeExtension: true, sillyficationExpansion: true, pathfindersExpansion: true};

    expect(new GameCards(withoutPathfinders).getPreludeCards().map(toName)).to.not.contain(CardName.MARS_HOMESTEAD_ACT);
    expect(new GameCards(withPathfinders).getPreludeCards().map(toName)).to.contain(CardName.MARS_HOMESTEAD_ACT);
  });

  it('only offers Epsilon Dample when deltaProjectExpansion is also on', () => {
    const withoutDelta: GameOptions = {...DEFAULT_GAME_OPTIONS, corporateEra: true, sillyficationExpansion: true, deltaProjectExpansion: false};
    const withDelta: GameOptions = {...DEFAULT_GAME_OPTIONS, corporateEra: true, sillyficationExpansion: true, deltaProjectExpansion: true};

    expect(new GameCards(withoutDelta).getCorporationCards().map(toName)).to.not.contain(CardName.EPSILON_DAMPLE);
    expect(new GameCards(withDelta).getCorporationCards().map(toName)).to.contain(CardName.EPSILON_DAMPLE);
  });

  it('only offers Zeta Tollkeeper when deltaProjectExpansion is also on', () => {
    const withoutDelta: GameOptions = {...DEFAULT_GAME_OPTIONS, corporateEra: true, sillyficationExpansion: true, deltaProjectExpansion: false};
    const withDelta: GameOptions = {...DEFAULT_GAME_OPTIONS, corporateEra: true, sillyficationExpansion: true, deltaProjectExpansion: true};

    expect(new GameCards(withoutDelta).getCorporationCards().map(toName)).to.not.contain(CardName.ZETA_TOLLKEEPER);
    expect(new GameCards(withDelta).getCorporationCards().map(toName)).to.contain(CardName.ZETA_TOLLKEEPER);
  });
});
