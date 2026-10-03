import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {WasteIncinerator} from '../../../src/server/cards/solaris/WasteIncinerator';
import {setRulingParty} from '../../TestingUtils';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {cast} from '../../../src/common/utils/utils';

describe('WasteIncinerator', () => {
  let card: WasteIncinerator;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new WasteIncinerator();
    [game, player] = testGame(2, {turmoilExtension: true});
  });

  it('cannot play unless Kelvinists rule or you have 2 delegates there', () => {
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.false;
  });

  it('can play when Kelvinists are ruling', () => {
    setRulingParty(game, PartyName.KELVINISTS);
    player.megaCredits = card.cost;
    expect(card.canPlay(player)).is.true;
  });

  it('play increases heat production 3 steps', () => {
    setRulingParty(game, PartyName.KELVINISTS);
    cast(card.play(player), undefined);
    expect(player.production.heat).to.eq(3);
  });
});
