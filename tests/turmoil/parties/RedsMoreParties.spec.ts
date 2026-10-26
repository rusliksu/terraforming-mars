import {expect} from 'chai';
import {RedsMoreParties} from '../../../src/server/turmoil/parties/RedsMoreParties';
import {REDS_BONUS_1, REDS_POLICY_1} from '../../../src/server/turmoil/parties/Reds';
import {
  REDS_MORE_PARTIES_BONUS_2,
  REDS_MORE_PARTIES_POLICY_3,
} from '../../../src/server/turmoil/parties/RedsMoreParties';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {TileType} from '../../../src/common/TileType';
import {SellPatentsStandardProject} from '../../../src/server/cards/base/standardProjects/SellPatentsStandardProject';
import {ImportedNitrogen} from '../../../src/server/cards/base/ImportedNitrogen';

describe('RedsMoreParties', () => {
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.REDS);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('reuses the exact same bonus A and policy 1 objects as vanilla Reds', () => {
    const party = new RedsMoreParties();
    expect(party.bonuses[0]).to.eq(REDS_BONUS_1);
    expect(party.policies[0]).to.eq(REDS_POLICY_1);
  });

  it('bonus B: the player(s) with the fewest tiles on Mars gains 1 TR', () => {
    const trBefore = player.terraformRating;
    REDS_MORE_PARTIES_BONUS_2.grant(game);
    expect(player.terraformRating).to.eq(trBefore + 1);
  });

  it('policy 2: forces a discard when a standard project is played', () => {
    setRulingParty(game, PartyName.REDS, 'rp02');
    player.cardsInHand = [new ImportedNitrogen()];
    const beforeHand = player.cardsInHand.length;
    const beforeDiscardPile = game.projectDeck.discardPile.length;

    const sellPatents = new SellPatentsStandardProject();
    const selectCard = sellPatents.action(player);
    selectCard.cb([]); // sell 0 patents -- just triggers the standard-project hook
    game.deferredActions.runAll(() => {});

    expect(player.cardsInHand.length).to.eq(beforeHand - 1);
    expect(game.projectDeck.discardPile.length).to.eq(beforeDiscardPile + 1);
  });

  it('policy 3: pays 3 M€ when a tile is placed on Mars', () => {
    player.megaCredits = 10;
    REDS_MORE_PARTIES_POLICY_3.onTilePlaced(player);
    game.deferredActions.runAll(() => {});
    expect(player.megaCredits).to.eq(7);
  });

  it('policy 3: pays as much as possible when short on M€', () => {
    player.megaCredits = 2;
    REDS_MORE_PARTIES_POLICY_3.onTilePlaced(player);
    game.deferredActions.runAll(() => {});
    expect(player.megaCredits).to.eq(0);
  });

  it('policy 4: decreases M€ production when a Mars global parameter is raised', () => {
    setRulingParty(game, PartyName.REDS, 'rp04');
    player.production.override({megacredits: 5});
    game.increaseOxygenLevel(player, 1);
    expect(player.production.megacredits).to.eq(4);
  });

  it('policy 4: has no effect on non-Mars parameters (e.g. Venus)', () => {
    setRulingParty(game, PartyName.REDS, 'rp04');
    player.production.override({megacredits: 5});
    game.increaseVenusScaleLevel(player, 1);
    expect(player.production.megacredits).to.eq(5);
  });

  it('bonus B: only the player(s) tied for fewest Mars tiles gain the TR, not everyone', () => {
    const [twoPlayerGame, playerOne, playerTwo] = testGame(2, {turmoilExtension: true, morePartiesExpansion: true});
    const space = twoPlayerGame.board.getAvailableSpacesOnLand(playerOne)[0];
    twoPlayerGame.addTile(playerOne, space, {tileType: TileType.CITY});

    const oneBefore = playerOne.terraformRating;
    const twoBefore = playerTwo.terraformRating;
    REDS_MORE_PARTIES_BONUS_2.grant(twoPlayerGame);

    expect(playerOne.terraformRating).to.eq(oneBefore);
    expect(playerTwo.terraformRating).to.eq(twoBefore + 1);
  });
});
