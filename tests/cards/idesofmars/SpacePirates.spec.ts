import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {SpacePirates} from '../../../src/server/cards/idesofmars/SpacePirates';
import {ColonyName} from '../../../src/common/colonies/ColonyName';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {Colony} from '../../../src/server/colonies/Colony';
import {ColonyBenefit} from '../../../src/common/colonies/ColonyBenefit';
import {Resource} from '../../../src/common/Resource';
import {runAllActions} from '../../TestingUtils';
import {SelectColony} from '../../../src/server/inputs/SelectColony';
import {AndOptions} from '../../../src/server/inputs/AndOptions';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectOption} from '../../../src/server/inputs/SelectOption';
import {cast} from '../../../src/common/utils/utils';

/** A simple fixed-payout colony, patterned after CoordinatedRaid/SmugglingOperations' test colony. */
class TestColony extends Colony {
  constructor() {
    super({
      name: 'TestColony' as ColonyName,
      build: {
        description: '',
        type: ColonyBenefit.GAIN_RESOURCES,
        quantity: [3, 3, 3],
        resource: Resource.TITANIUM,
      },
      trade: {
        description: '',
        type: ColonyBenefit.GAIN_RESOURCES,
        quantity: [4, 5, 6, 7, 8, 9, 10],
        resource: Resource.MEGACREDITS,
      },
      colony: {
        description: '',
        type: ColonyBenefit.GAIN_RESOURCES,
        quantity: 7,
        resource: Resource.STEEL,
      }});
  }
}

describe('SpacePirates', () => {
  let card: SpacePirates;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new SpacePirates();
    // 2 players, not 1: a solo game with the Colonies expansion queues its own
    // "remove a colony" setup step (Game.gotoInitialResearchPhase), which would otherwise get
    // in the way of driving this card's own trade flow below.
    [game, player] = testGame(2, {
      coloniesExtension: true,
      customColoniesList: [
        ColonyName.PLUTO,
        ColonyName.TRITON,
        ColonyName.CALLISTO,
        ColonyName.ENCELADUS,
        ColonyName.LUNA,
      ],
    });
    game.colonies = [game.colonies[0], new TestColony()];
  });

  it('cannot play without the Colonies expansion', () => {
    const [, playerWithoutColonies] = testGame(1, {coloniesExtension: false});
    expect(card.canPlay(playerWithoutColonies)).is.false;
  });

  it('cannot play with no tradeable colonies', () => {
    game.colonies = [];
    expect(card.canPlay(player)).is.false;
  });

  it('can play when a colony is tradeable, even with no fleets available', () => {
    player.colonies.setFleetSize(0);
    expect(card.canPlay(player)).is.true;
  });

  it('grants a fleet and presents the normal trade UI', () => {
    player.colonies.setFleetSize(0);
    player.megaCredits = 10;

    const andOptions = cast(card.play(player), AndOptions);
    // Fleet is granted immediately, before the trade itself resolves.
    expect(player.colonies.getFleetSize()).to.eq(1);
    // The normal Colonies.coloniesTradeAction() shape: pick how to pay, then pick a colony.
    expect(andOptions.options).has.lengthOf(2);
  });

  it('trades using the newly granted fleet', () => {
    player.colonies.setFleetSize(0);
    player.megaCredits = 10;

    const andOptions = cast(card.play(player), AndOptions);
    const [payment, selectColonyInput] = andOptions.options;
    const orOptions = cast(payment, OrOptions);
    // Pay with M€ -- the last of the offered payment options in Colonies.tradeWithColony.
    const payWithMegacredits = cast(orOptions.options[orOptions.options.length - 1], SelectOption);
    payWithMegacredits.cb(undefined);
    const selectColony = cast(selectColonyInput, SelectColony);
    selectColony.cb(game.colonies[1]); // the fixed-payout TestColony
    runAllActions(game);

    expect(player.colonies.usedTradeFleets).to.eq(1);
  });

  it('removes the neutral fleet on the next production phase, exactly once', () => {
    player.colonies.setFleetSize(2); // the default 1 plus the 1 this card granted
    card.data = true;

    card.onProductionPhase(player);
    expect(player.colonies.getFleetSize()).to.eq(1);
    expect(card.data).is.false;

    // A second call (e.g. because Game.ts's end-of-generation resolution loop runs more than
    // once) must not remove a second fleet.
    player.colonies.setFleetSize(5);
    card.onProductionPhase(player);
    expect(player.colonies.getFleetSize()).to.eq(5);
  });
});
