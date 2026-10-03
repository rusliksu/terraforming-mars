import {expect} from 'chai';
import {VenusianGroundLaboratory} from '../../../src/server/cards/idesofmars/VenusianGroundLaboratory';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {setVenusScaleLevel} from '../../TestingUtils';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {cast} from '../../../src/common/utils/utils';

describe('VenusianGroundLaboratory', () => {
  let card: VenusianGroundLaboratory;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new VenusianGroundLaboratory();
    [game, player] = testGame(1, {venusNextExtension: true});
  });

  it('cannot play below 8% Venus', () => {
    setVenusScaleLevel(game, 6);
    expect(card.canPlay(player)).is.false;
  });

  it('can play at 8% Venus', () => {
    setVenusScaleLevel(game, 8);
    expect(card.canPlay(player)).is.true;
  });

  it('increases M€ production on play', () => {
    setVenusScaleLevel(game, 8);
    card.play(player);
    expect(player.production.megacredits).to.eq(1);
  });

  it('cannot act without both M€ and steel', () => {
    player.megaCredits = 0;
    player.steel = 3;
    expect(card.canAct(player)).is.false;

    player.megaCredits = 3;
    player.steel = 0;
    expect(card.canAct(player)).is.false;
  });

  it('spends equal M€ and steel for that much titanium', () => {
    player.megaCredits = 5;
    player.steel = 3;
    expect(card.canAct(player)).is.true;

    const selectAmount = cast(card.action(player), SelectAmount);
    expect(selectAmount.max).to.eq(3);
    selectAmount.cb(3);

    expect(player.megaCredits).to.eq(2);
    expect(player.steel).to.eq(0);
    expect(player.titanium).to.eq(3);
  });
});
