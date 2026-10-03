import {expect} from 'chai';
import {
  SPOME_BONUS_1,
  SPOME_BONUS_2,
  SPOME_POLICY_3,
} from '../../../src/server/turmoil/parties/Spome';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {forcePartiesInPlay, setRulingParty} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {TileType} from '../../../src/common/TileType';
import {MoonExpansion} from '../../../src/server/moon/MoonExpansion';
import {SelectColony} from '../../../src/server/inputs/SelectColony';
import {cast} from '../../../src/common/utils/utils';

describe('Spome', () => {
  let game: IGame;
  let player: TestPlayer;
  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.SPOME);
    [game, player] = testGame(1, {turmoilExtension: true, morePartiesExpansion: true, moonExpansion: true, coloniesExtension: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('bonus A: scores and grants 1 M€ per lunar habitat tile', () => {
    expect(SPOME_BONUS_1.getScore(player)).to.eq(0);
    const moonSpaces = game.moonData!.moon.getAvailableSpacesOnLand(player);
    MoonExpansion.addHabitatTile(player, moonSpaces[0].id);
    expect(SPOME_BONUS_1.getScore(player)).to.eq(1);

    const before = player.megaCredits;
    SPOME_BONUS_1.grantForPlayer(player);
    expect(player.megaCredits).to.eq(before + 1);
  });

  it('bonus B: scores 1 M€ per tile adjacent to a city and per colony', () => {
    expect(SPOME_BONUS_2.getScore(player)).to.eq(0);

    const citySpace = game.board.getAvailableSpacesOnLand(player)[0];
    game.addTile(player, citySpace, {tileType: TileType.CITY});
    const adjacentSpace = game.board.getAdjacentSpaces(citySpace).find((s) => s.tile === undefined);
    expect(adjacentSpace).to.not.be.undefined;
    game.addTile(player, adjacentSpace!, {tileType: TileType.GREENERY});

    expect(SPOME_BONUS_2.getScore(player)).to.eq(1);

    game.colonies[0].addColony(player);
    expect(SPOME_BONUS_2.getScore(player)).to.eq(2);
  });

  it('policy 1: draws a card when a city tile is placed', () => {
    setRulingParty(game, PartyName.SPOME, 'spop01');
    const beforeHand = player.cardsInHand.length;
    const citySpace = game.board.getAvailableSpacesOnLand(player)[0];
    game.addCity(player, citySpace);
    expect(player.cardsInHand.length).to.eq(beforeHand + 1);
  });

  it('policy 2: gains 4 M€ when a lunar habitat tile is placed', () => {
    setRulingParty(game, PartyName.SPOME, 'spop02');
    const before = player.megaCredits;
    const moonSpaces = game.moonData!.moon.getAvailableSpacesOnLand(player);
    MoonExpansion.addHabitatTile(player, moonSpaces[0].id);
    expect(player.megaCredits).to.eq(before + 4);
  });

  it('policy 3: pays 15 M€ (titanium usable) to place a colony', () => {
    // A 5-player game so Colonies setup doesn't queue a RemoveColonyFromGame prompt (which
    // needs a real player choice) ahead of this policy's own deferred payment.
    const [coloniesGame, coloniesPlayer] = testGame(5, {turmoilExtension: true, morePartiesExpansion: true, coloniesExtension: true});
    coloniesPlayer.megaCredits = 15;
    expect(SPOME_POLICY_3.canAct(coloniesPlayer)).is.true;
    SPOME_POLICY_3.action(coloniesPlayer);
    coloniesGame.deferredActions.runNext(); // resolves the payment
    const buildColonyAction = coloniesGame.deferredActions.pop();
    const selectColony = cast(buildColonyAction?.execute(), SelectColony);
    const colony = selectColony.colonies[0];
    selectColony.cb(colony);

    expect(coloniesPlayer.megaCredits).to.eq(0);
    expect(colony.colonies).to.include(coloniesPlayer.id);
  });

  it('policy 3 cannot act without enough M€', () => {
    player.megaCredits = 0;
    expect(SPOME_POLICY_3.canAct(player)).is.false;
  });
});
