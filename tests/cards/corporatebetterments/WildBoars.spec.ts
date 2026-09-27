import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {setOxygenLevel} from '../../TestingUtils';
import {WildBoars} from '../../../src/server/cards/corporatebetterments/WildBoars';
import {SelectPlayer} from '../../../src/server/inputs/SelectPlayer';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('WildBoars', () => {
  let card: WildBoars;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new WildBoars();
    [game, player, player2] = testGame(2);
  });

  it('cannot play below 11% oxygen', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play at 11% oxygen', () => {
    setOxygenLevel(game, 11);
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act when no opponent has plants', () => {
    player2.plants = 0;
    expect(card.canAct(player)).is.false;
  });

  it('removes a plant from an opponent and adds an animal to this card', () => {
    player2.plants = 3;
    expect(card.canAct(player)).is.true;

    const selectPlayer = cast(card.action(player), SelectPlayer);
    selectPlayer.cb(player2);

    expect(player2.plants).to.eq(2);
    expect(card.resourceCount).to.eq(1);
  });

  it('awards 1 VP per animal on this card', () => {
    player.addResourceTo(card, 4);
    expect(card.getVictoryPoints(player)).to.eq(4);
  });
});
