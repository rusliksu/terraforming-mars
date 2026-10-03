import {expect} from 'chai';
import {MicroEnergy} from '../../../src/server/cards/sillyfication/MicroEnergy';
import {MicroSteel} from '../../../src/server/cards/sillyfication/MicroSteel';
import {MicroPlant} from '../../../src/server/cards/sillyfication/MicroPlant';
import {MicroTitanium} from '../../../src/server/cards/sillyfication/MicroTitanium';
import {testGame} from '../../TestGame';

describe('Micro resource cards', () => {
  it('Micro Energy raises energy production 1 step', () => {
    const [/* game */, player] = testGame(2);
    new MicroEnergy().play(player);
    expect(player.production.energy).to.eq(1);
  });

  it('Micro Steel raises steel production 1 step', () => {
    const [/* game */, player] = testGame(2);
    new MicroSteel().play(player);
    expect(player.production.steel).to.eq(1);
  });

  it('Micro Plant raises plant production 1 step', () => {
    const [/* game */, player] = testGame(2);
    new MicroPlant().play(player);
    expect(player.production.plants).to.eq(1);
  });

  it('Micro Titanium raises titanium production 1 step', () => {
    const [/* game */, player] = testGame(2);
    new MicroTitanium().play(player);
    expect(player.production.titanium).to.eq(1);
  });
});
