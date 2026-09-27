import {expect} from 'chai';
import {cast} from '../../../src/common/utils/utils';
import {CompanyMerger} from '../../../src/server/cards/corporatebetterments/CompanyMerger';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {runAllActions} from '../../TestingUtils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {ICorporationCard} from '../../../src/server/cards/corporation/ICorporationCard';
import {IPreludeCard} from '../../../src/server/cards/prelude/IPreludeCard';
import {ArcadianCommunities} from '../../../src/server/cards/promo/ArcadianCommunities';
import {SaturnSystems} from '../../../src/server/cards/corporation/SaturnSystems';
import {Donation} from '../../../src/server/cards/prelude/Donation';
import {SmeltingPlant} from '../../../src/server/cards/prelude/SmeltingPlant';
import {BeginnerCorporation} from '../../../src/server/cards/corporation/BeginnerCorporation';
import {CardName} from '../../../src/common/cards/CardName';

describe('CompanyMerger', () => {
  let card: CompanyMerger;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new CompanyMerger();
    [game, player] = testGame(2, {preludeExtension: true});
    // A vestigial corporation, so playing the drawn corporation is treated as an additional corp.
    player.playedCards.push(new BeginnerCorporation());
    player.megaCredits = 0;
  });

  it('draws 2 corporations and plays the chosen one with its starting M€, then draws 2 preludes and plays the chosen one', () => {
    const arcadian = new ArcadianCommunities();
    const saturnSystems = new SaturnSystems();
    // Deck.draw() pops from the end of drawPile, so the last-pushed card is drawn first.
    game.corporationDeck.drawPile.push(saturnSystems, arcadian);

    const donation = new Donation();
    const smeltingPlant = new SmeltingPlant();
    game.preludeDeck.drawPile.push(smeltingPlant, donation);

    card.play(player);
    runAllActions(game);

    const selectCorp = cast(player.popWaitingFor(), SelectCard<ICorporationCard>);
    expect(selectCorp.cards).deep.eq([arcadian, saturnSystems]);
    selectCorp.cb([arcadian]);
    runAllActions(game);

    expect(player.tableau.has(CardName.ARCADIAN_COMMUNITIES)).is.true;
    expect(player.megaCredits).eq(40);
    expect(game.corporationDeck.discardPile).includes(saturnSystems);

    const selectPrelude = cast(player.popWaitingFor(), SelectCard<IPreludeCard>);
    expect(selectPrelude.cards).deep.eq([donation, smeltingPlant]);
    selectPrelude.cb([donation]);
    runAllActions(game);

    expect(player.tableau.has(CardName.DONATION)).is.true;
    expect(game.preludeDeck.discardPile).includes(smeltingPlant);
  });

  it('scores a flat 2 VP', () => {
    expect(card.getVictoryPoints(player)).eq(2);
  });
});
