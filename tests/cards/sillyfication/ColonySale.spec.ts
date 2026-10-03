import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {ColonySale} from '../../../src/server/cards/sillyfication/ColonySale';
import {SelectColony} from '../../../src/server/inputs/SelectColony';
import {ColonyName} from '../../../src/common/colonies/ColonyName';
import {IGame} from '../../../src/server/IGame';
import {IColony} from '../../../src/server/colonies/IColony';
import {NEUTRAL_COLONY_OWNER} from '../../../src/common/Types';
import {cast} from '@/common/utils/utils';
import {runAllActions} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {CardName} from '../../../src/common/cards/CardName';

describe('ColonySale', () => {
  let card: ColonySale;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;
  let ganymede: IColony;
  let luna: IColony;

  beforeEach(() => {
    card = new ColonySale();
    [game, player, player2] = testGame(2, {
      coloniesExtension: true,
      customColoniesList: [
        ColonyName.GANYMEDE,
        ColonyName.LUNA,
        ColonyName.PLUTO,
        ColonyName.TITAN,
        ColonyName.TRITON],
    });
    ganymede = game.colonies.find((c) => c.name === ColonyName.GANYMEDE)!;
    luna = game.colonies.find((c) => c.name === ColonyName.LUNA)!;
  });

  it('cannot be played without any colony', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can be played once you have a colony', () => {
    ganymede.colonies = [player.id];
    expect(card.canPlay(player)).is.true;
  });

  it('only offers colonies the player actually has a colony on', () => {
    ganymede.colonies = [player.id];
    luna.colonies = [player2.id];

    const selectColony = cast(card.play(player), SelectColony);
    expect(selectColony.colonies).deep.eq([ganymede]);
  });

  it('sells the colony for 17 M€ and leaves the slot occupied by a neutral colony', () => {
    ganymede.colonies = [player2.id, player.id];
    const mcBefore = player.megaCredits;

    const selectColony = cast(card.play(player), SelectColony);
    selectColony.cb(ganymede);
    runAllActions(game);

    expect(player.megaCredits).eq(mcBefore + 17);
    // The slot count is unchanged (still taken) - only the owner is gone.
    expect(ganymede.colonies).deep.eq([player2.id, NEUTRAL_COLONY_OWNER]);
  });

  it('a sold colony does not count toward the seller\'s colony total anymore', () => {
    ganymede.colonies = [player.id];

    const selectColony = cast(card.play(player), SelectColony);
    selectColony.cb(ganymede);
    runAllActions(game);

    expect(ganymede.colonies.includes(player.id)).is.false;
  });

  it('a sold colony gives no bonus when someone trades with it', () => {
    ganymede.colonies = [player.id];
    const selectColony = cast(card.play(player), SelectColony);
    selectColony.cb(ganymede);
    runAllActions(game);

    const plantsBefore = player.plants;
    player2.megaCredits = 10;
    ganymede.trade(player2, {usesTradeFleet: false});
    runAllActions(game);

    // The sold slot's former owner gets nothing from this trade.
    expect(player.plants).eq(plantsBefore);
  });

  it('is registered as CardName.COLONY_SALE', () => {
    expect(card.name).eq(CardName.COLONY_SALE);
  });
});
