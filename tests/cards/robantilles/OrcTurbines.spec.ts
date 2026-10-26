import {expect} from 'chai';
import {OrcTurbines} from '../../../src/server/cards/robantilles/OrcTurbines';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {SelectAmount} from '../../../src/server/inputs/SelectAmount';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {Resource} from '../../../src/common/Resource';
import {cast} from '../../../src/common/utils/utils';

describe('OrcTurbines', () => {
  let card: OrcTurbines;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new OrcTurbines();
    [game, player] = testGame(1);
  });

  it('cannot act with less than 2 heat available', () => {
    player.heat = 1;
    expect(card.canAct(player)).is.false;
  });

  it('can act with at least 2 heat available', () => {
    player.heat = 2;
    expect(card.canAct(player)).is.true;
  });

  it('offers up to 5 conversions of 2 heat into 1 energy', () => {
    player.heat = 20;
    const selectAmount = cast(card.action(player), SelectAmount);
    expect(selectAmount.min).to.eq(1);
    expect(selectAmount.max).to.eq(5);

    selectAmount.cb(3);
    expect(player.heat).to.eq(20 - 6);
    expect(player.energy).to.eq(3);
  });

  it('caps the offered amount by available heat when fewer than 10', () => {
    player.heat = 5;
    const selectAmount = cast(card.action(player), SelectAmount);
    expect(selectAmount.max).to.eq(2);
  });

  describe('passive Energy-to-Heat production substitution', () => {
    beforeEach(() => {
      player.playedCards.push(card);
      player.production.override({energy: 3, heat: 2});
    });

    it('offers a choice instead of immediately decreasing Energy production', () => {
      player.production.add(Resource.ENERGY, -1, {log: true});
      // The reduction is deferred into a choice, not applied immediately.
      expect(player.production.energy).to.eq(3);

      const orOptions = cast(game.deferredActions.pop()?.execute(), OrOptions);
      expect(orOptions.options).has.lengthOf(2);
    });

    it('can choose to decrease Energy production normally', () => {
      player.production.add(Resource.ENERGY, -1, {log: true});
      const orOptions = cast(game.deferredActions.pop()?.execute(), OrOptions);
      orOptions.options[0].cb(undefined);

      expect(player.production.energy).to.eq(2);
      expect(player.production.heat).to.eq(2);
    });

    it('can choose to decrease Heat production by 2 instead', () => {
      player.production.add(Resource.ENERGY, -1, {log: true});
      const orOptions = cast(game.deferredActions.pop()?.execute(), OrOptions);
      orOptions.options[1].cb(undefined);

      expect(player.production.energy).to.eq(3);
      expect(player.production.heat).to.eq(0);
    });

    it('scales the Heat substitution with the size of the Energy decrease', () => {
      player.production.override({energy: 3, heat: 4});
      player.production.add(Resource.ENERGY, -2, {log: true});
      const orOptions = cast(game.deferredActions.pop()?.execute(), OrOptions);
      orOptions.options[1].cb(undefined);

      expect(player.production.heat).to.eq(0);
    });

    it('applies the Energy loss directly when there is no Heat production to substitute', () => {
      player.production.override({energy: 3, heat: 0});
      player.production.add(Resource.ENERGY, -1, {log: true});

      const result = game.deferredActions.pop()?.execute();
      expect(result).is.undefined;
      expect(player.production.energy).to.eq(2);
    });
  });
});
