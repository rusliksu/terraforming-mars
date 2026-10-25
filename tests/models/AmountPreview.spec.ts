import {expect} from 'chai';
import {Insulation} from '../../src/server/cards/base/Insulation';
import {PowerInfrastructure} from '../../src/server/cards/base/PowerInfrastructure';
import {SelectAmount} from '../../src/server/inputs/SelectAmount';
import {Resource} from '../../src/common/Resource';
import {CardName} from '../../src/common/cards/CardName';
import {testGame} from '../TestGame';
import {SistemasSeebeck} from '../../src/server/cards/pathfinders/SistemasSeebeck';
import {EnergyMarket} from '../../src/server/cards/promo/EnergyMarket';

describe('native amount display projection', () => {
  it('projects the real Insulation conversion without changing its default or effect', () => {
    const [, player] = testGame(1);
    player.production.add(Resource.HEAT, 4);
    const input = new Insulation().play(player);
    expect(input).instanceOf(SelectAmount);
    if (!(input instanceof SelectAmount)) {
      throw new Error('Expected native amount input');
    }
    const model = input.toModel(player);
    expect(model.maxByDefault).is.false;
    expect(model.preview).deep.eq({sourceCard: CardName.INSULATION,
      from: {kind: 'production', resource: Resource.HEAT, perStep: 1, before: 4},
      to: {kind: 'production', resource: Resource.MEGACREDITS, perStep: 1, before: 0}});
    expect(player.production.heat).eq(4);
    input.process({type: 'amount', amount: 3});
    expect(player.production.heat).eq(1);
    expect(player.production.megacredits).eq(3);
  });

  it('uses fresh native values and never infers a conversion from an ambiguous title', () => {
    const [, player] = testGame(1);
    player.energy = 4;
    player.megaCredits = 7;
    const input = new PowerInfrastructure().action(player);
    expect(input.toModel(player).preview?.from.before).eq(4);
    player.energy = 3;
    expect(input.toModel(player).preview?.from.before).eq(3);
    expect(input.toModel(player).preview?.to.before).eq(7);
    expect(input.selected).eq(-1);
    const unrelated = new SelectAmount(input.title, input.buttonLabel, 1, 4);
    expect(unrelated.toModel(player).preview).is.undefined;
    input.process({type: 'amount', amount: 2});
    expect(player.energy).eq(1);
    expect(player.megaCredits).eq(9);
  });

  it('shows a price without claiming a stock remainder when our payment rules allow alternatives', () => {
    const [, player] = testGame(1);
    player.playedCards.push(new SistemasSeebeck());
    player.energy = 1;
    player.heat = 4;
    player.megaCredits = 10;
    const power = new PowerInfrastructure().action(player).toModel(player).preview;
    expect(power?.from).deep.eq({kind: 'cost', resource: Resource.ENERGY, perStep: 1});
    expect(power?.to.before).eq(10);
    const market = new EnergyMarket().action(player);
    expect(market).instanceOf(SelectAmount);
    if (!(market instanceof SelectAmount)) {
      throw new Error('Expected native amount input');
    }
    expect(market.toModel(player).preview?.from).deep.eq({kind: 'cost', resource: Resource.MEGACREDITS, perStep: 2});
    expect(player.energy).eq(1);
    expect(player.heat).eq(4);
    expect(player.megaCredits).eq(10);
  });
});
