import {expect} from 'chai';
import {Bribery} from '../../../src/server/cards/solaris/Bribery';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setRulingParty, forcePartiesInPlay} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {SelectPlayer} from '../../../src/server/inputs/SelectPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('Bribery', () => {
  let card: Bribery;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;
  let player3: TestPlayer;

  let restoreShuffle: () => void;

  beforeEach(() => {
    restoreShuffle = forcePartiesInPlay(PartyName.BUREAUCRATS);
    card = new Bribery();
    [game, player, player2, player3] = testGame(3, {turmoilExtension: true, morePartiesExpansion: true});
  });

  afterEach(() => {
    restoreShuffle();
  });

  it('cannot play without Bureaucrats ruling or 2 delegates', () => {
    expect(card.canPlay(player)).is.false;
    setRulingParty(game, PartyName.BUREAUCRATS);
    expect(card.canPlay(player)).is.true;
  });

  it('lets the player pick an opponent to bribe', () => {
    setRulingParty(game, PartyName.BUREAUCRATS);
    const productionBefore = player.production.megacredits;

    const selectPlayer = cast(card.play(player), SelectPlayer);
    expect(selectPlayer.players).to.have.members([player2, player3]);
    selectPlayer.cb(player2);

    expect(player.production.megacredits).to.eq(productionBefore + 1);
    expect(player2.production.megacredits).to.eq(-1);
  });

  it('plays directly against the sole opponent in a 2-player game', () => {
    setRulingParty(game, PartyName.BUREAUCRATS);
    const [twoPlayerGame, solo, opponent] = testGame(2, {turmoilExtension: true, morePartiesExpansion: true});
    setRulingParty(twoPlayerGame, PartyName.BUREAUCRATS);

    card.play(solo);

    expect(solo.production.megacredits).to.eq(1);
    expect(opponent.production.megacredits).to.eq(-1);
  });
});
