import {expect} from 'chai';
import {runAllActions, setOxygenLevel} from '../../../TestingUtils';
import {GreeneryStandardProject} from '../../../../src/server/cards/base/standardProjects/GreeneryStandardProject';
import {TestPlayer} from '../../../TestPlayer';
import {IGame} from '../../../../src/server/IGame';
import {PoliticalAgendas} from '../../../../src/server/turmoil/PoliticalAgendas';
import {Reds} from '../../../../src/server/turmoil/parties/Reds';
import {Phase} from '../../../../src/common/Phase';
import {MAX_OXYGEN_LEVEL} from '../../../../src/common/constants';
import {TileType} from '../../../../src/common/TileType';
import {testGame} from '../../../TestGame';
import {assertPlaceTile} from '../../../assertions';
import {Payment} from '../../../../src/common/inputs/Payment';
import {LogMessageDataType} from '../../../../src/common/logs/LogMessageDataType';

describe('GreeneryStandardProject', () => {
  let card: GreeneryStandardProject;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new GreeneryStandardProject();
    [game, player] = testGame(1);
  });

  it('Can act', () => {
    player.megaCredits = card.cost - 1;
    expect(card.canAct(player)).is.false;
    player.megaCredits = card.cost;
    expect(card.canAct(player)).is.true;
  });

  it('action', () => {
    player.megaCredits = card.cost;
    player.setTerraformRating(20);
    expect(game.getOxygenLevel()).eq(0);

    card.payAndExecute(player, Payment.of({megacredits: card.cost}));
    runAllActions(game);
    assertPlaceTile(player, player.popWaitingFor(), TileType.GREENERY);

    expect(player.megaCredits).eq(0);
    expect(player.terraformRating).eq(21);
    expect(game.getOxygenLevel()).eq(1);
  });

  it('logs the resources spent', () => {
    player.megaCredits = card.cost;
    card.payAndExecute(player, Payment.of({megacredits: card.cost}));

    const log = game.gameLog[game.gameLog.length - 1];
    expect(log.message).eq('${0} used ${1} standard project [ ${2} ]');
    expect(log.data[2]).deep.eq({type: LogMessageDataType.STRING, value: '-23:r:mc:'});
  });

  it('can act when maximized', () => {
    player.megaCredits = card.cost;
    expect(card.canAct(player)).is.true;
    setOxygenLevel(game, MAX_OXYGEN_LEVEL);
    // Players can still place greeneries even if the oxygen level is maximized
    expect(card.canAct(player)).is.true;
  });

  it('Can not act with reds', () => {
    [game, player] = testGame(1, {turmoilExtension: true});

    player.megaCredits = card.cost;
    player.game.phase = Phase.ACTION;
    player.game.turmoil!.rulingParty = new Reds();
    PoliticalAgendas.setNextAgenda(player.game.turmoil!, player.game);
    expect(card.canAct(player)).eq(false);
    player.megaCredits = card.cost + 2;
    expect(card.canAct(player)).eq(false);
    player.megaCredits = card.cost + 3;
    expect(card.canAct(player)).eq(true);
  });
});
