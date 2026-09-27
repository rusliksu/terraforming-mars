import {expect} from 'chai';
import {IonicThrustersSupport} from '../../../src/server/cards/venusPhase2/IonicThrustersSupport';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {SelectPlayer} from '../../../src/server/inputs/SelectPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('IonicThrustersSupport', () => {
  let card: IonicThrustersSupport;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new IonicThrustersSupport();
    [/* game */, player, player2] = testGame(2);
  });

  it('cannot play without an opponent', () => {
    const [soloGame, soloPlayer] = testGame(1);
    expect(soloGame).to.exist;
    expect(card.canPlay(soloPlayer)).is.false;
  });

  it('increases M€ production 1 step per 2 floaters the chosen opponent owns', () => {
    const dirigibles = new Dirigibles();
    dirigibles.resourceCount = 5;
    player2.playedCards.push(dirigibles);

    const selectPlayer = cast(card.play(player), SelectPlayer);
    selectPlayer.cb(player2);

    expect(player.production.megacredits).to.eq(2);
  });
});
