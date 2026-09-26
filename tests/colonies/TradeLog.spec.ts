import {expect} from 'chai';
import {ColonyName} from '@/common/colonies/ColonyName';
import {ENERGY_TRADE_COST, MC_TRADE_COST, TITANIUM_TRADE_COST} from '@/common/constants';
import {Payment} from '@/common/inputs/Payment';
import {TradeWithEnergy, TradeWithMegacredits, TradeWithTitanium} from '@/server/player/Colonies';
import {IColony} from '@/server/colonies/IColony';
import {SelectPayment} from '@/server/inputs/SelectPayment';
import {testGame} from '@tests/TestGame';
import {runNextAction} from '@tests/TestingUtils';
import {cast} from '@/common/utils/utils';

describe('Colony trade replay expenses', () => {
  function setup() {
    const [game, player] = testGame(1, {coloniesExtension: true, customColoniesList: [
      ColonyName.LUNA, ColonyName.PLUTO, ColonyName.IO, ColonyName.CALLISTO,
    ]});
    const colony: IColony | undefined = game.colonies.find((colony) => colony.name === ColonyName.LUNA);
    if (colony === undefined) {
      throw new Error('Luna colony missing');
    }
    while (game.deferredActions.pop() !== undefined) { /* Discard initial colony setup prompts. */ }
    return {game, player, colony};
  }

  it('records energy deducted for a trade', () => {
    const {game, player, colony} = setup();
    player.energy = ENERGY_TRADE_COST;
    new TradeWithEnergy(player).trade(colony);

    expect(player.energy).eq(0);
    expect(game.gameLog.find((message) => message.message.includes('energy to trade with'))?.payment)
      .deep.eq({megacredits: 0, steel: 0, titanium: 0, energy: ENERGY_TRADE_COST});
  });

  it('does not show an expense for a free trade', () => {
    const {game, player, colony} = setup();
    player.colonies.tradeDiscount = ENERGY_TRADE_COST;
    new TradeWithEnergy(player).trade(colony);

    expect(game.gameLog.find((message) => message.message.includes('energy to trade with'))?.payment).is.undefined;
  });

  it('records titanium deducted for a trade', () => {
    const {game, player, colony} = setup();
    player.titanium = TITANIUM_TRADE_COST;
    new TradeWithTitanium(player).trade(colony);

    expect(player.titanium).eq(0);
    expect(game.gameLog.find((message) => message.message.includes('titanium to trade with'))?.payment)
      .deep.eq({megacredits: 0, steel: 0, titanium: TITANIUM_TRADE_COST});
  });

  it('records actual megacredits paid after the trade payment resolves', () => {
    const {game, player, colony} = setup();
    player.megaCredits = MC_TRADE_COST + 1;
    new TradeWithMegacredits(player).trade(colony);
    runNextAction(game);

    expect(game.gameLog.find((message) => message.message.includes('M€ to trade with'))?.payment)
      .deep.eq({megacredits: MC_TRADE_COST, steel: 0, titanium: 0});
  });

  it('omits the whole trade expense when heat paid the nominal M€ cost', () => {
    const {game, player, colony} = setup();
    player.canUseHeatAsMegaCredits = true;
    player.heat = MC_TRADE_COST;
    new TradeWithMegacredits(player).trade(colony);
    cast(runNextAction(game), SelectPayment).process({
      type: 'payment', payment: Payment.of({heat: MC_TRADE_COST}),
    }, player);

    expect(game.gameLog.find((message) => message.message.includes('M€ to trade with'))?.payment).is.undefined;
  });
});
