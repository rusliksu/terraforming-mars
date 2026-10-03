import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {SmugglingOperations} from '../../../src/server/cards/corporatebetterments/SmugglingOperations';
import {SelectColony} from '../../../src/server/inputs/SelectColony';
import {ColonyName} from '../../../src/common/colonies/ColonyName';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {Colony} from '../../../src/server/colonies/Colony';
import {ColonyBenefit} from '../../../src/common/colonies/ColonyBenefit';
import {Resource} from '../../../src/common/Resource';
import {runAllActions} from '../../TestingUtils';
import {Units} from '../../../src/common/Units';
import {cast} from '../../../src/common/utils/utils';

/** A simple fixed-payout colony, patterned after CoordinatedRaid's test colony. */
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

describe('SmugglingOperations', () => {
  let card: SmugglingOperations;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new SmugglingOperations();
    [game, player, player2] = testGame(2, {
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

  it('requires at least one colony', () => {
    game.colonies = [];
    expect(card.canPlay(player)).is.false;
  });

  it('gives only the acting player the trade and colony bonuses, and does not move the track or use a trade fleet', () => {
    const colony = game.colonies[1] as TestColony;
    colony.addColony(player2);
    // Building the colony already advanced the track to 1 (colonies.length) and paid player2 its
    // build bonus (titanium); the card must not move the track further or pay player2 again.
    const trackPositionAfterBuild = colony.trackPosition;
    const player2StockAfterBuild = player2.stock.asUnits();

    const selectColony = cast(card.play(player), SelectColony);
    selectColony.cb(colony);
    runAllActions(game);

    // Trade bonus (5 M€, at track position 1) + the single colonist's colony bonus (7 steel),
    // both redirected to the acting player instead of the real colonist.
    expect(player.stock.asUnits()).deep.eq(Units.of({megacredits: 5, steel: 7}));
    expect(player2.stock.asUnits()).deep.eq(player2StockAfterBuild);
    expect(colony.trackPosition).eq(trackPositionAfterBuild);
    expect(player.colonies.usedTradeFleets).eq(0);
  });
});
