import {expect} from 'chai';
import {cast} from '../../../src/common/utils/utils';
import {Takeover} from '../../../src/server/cards/idesofmars/Takeover';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {ICorporationCard} from '../../../src/server/cards/corporation/ICorporationCard';
import {ArcadianCommunities} from '../../../src/server/cards/promo/ArcadianCommunities';
import {SaturnSystems} from '../../../src/server/cards/corporation/SaturnSystems';
import {BeginnerCorporation} from '../../../src/server/cards/corporation/BeginnerCorporation';
import {PhoboLog} from '../../../src/server/cards/corporation/PhoboLog';
import {CardName} from '../../../src/common/cards/CardName';
import {runAllActions} from '../../TestingUtils';

describe('Takeover', () => {
  let card: Takeover;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Takeover();
    [game, player] = testGame(2);
    // A vestigial corporation, so playing the drawn corporation is treated as an additional corp.
    player.playedCards.push(new BeginnerCorporation());
    player.megaCredits = 0;
  });

  it('cannot play before generation 5', () => {
    game.generation = 4;
    expect(card.canPlay(player)).is.false;
    game.generation = 5;
    expect(card.canPlay(player)).is.true;
  });

  it('draws 5 corporations and plays the chosen one with starting M€ reduced by 25', () => {
    game.generation = 5;
    // ArcadianCommunities grants 40 starting M€, so 40 - 25 = 15.
    const arcadian = new ArcadianCommunities();
    const saturnSystems = new SaturnSystems();
    const filler = [new SaturnSystems(), new SaturnSystems(), new SaturnSystems()];
    // Deck.draw() pops from the end of drawPile, so the last-pushed card is drawn first.
    game.corporationDeck.drawPile.push(saturnSystems, ...filler, arcadian);

    card.play(player);
    runAllActions(game);

    const selectCorp = cast(player.popWaitingFor(), SelectCard<ICorporationCard>);
    expect(selectCorp.cards).has.lengthOf(5);
    expect(selectCorp.cards).includes(arcadian);
    selectCorp.cb([arcadian]);

    expect(player.tableau.has(CardName.ARCADIAN_COMMUNITIES)).is.true;
    expect(player.megaCredits).eq(15);
    expect(game.corporationDeck.discardPile).includes(saturnSystems);
  });

  it('floors the M€ reduction at 0 when starting M€ is less than 25', () => {
    game.generation = 5;
    // PhoboLog grants only 23 starting M€, less than the 25 reduction, so the net gain floors at 0.
    const phoboLog = new PhoboLog();
    const filler = [new SaturnSystems(), new SaturnSystems(), new SaturnSystems(), new SaturnSystems()];
    game.corporationDeck.drawPile.push(...filler, phoboLog);

    card.play(player);
    runAllActions(game);

    const selectCorp = cast(player.popWaitingFor(), SelectCard<ICorporationCard>);
    selectCorp.cb([phoboLog]);

    expect(player.megaCredits).eq(0);
  });
});
