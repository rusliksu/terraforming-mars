import {expect} from 'chai';
import {EinsteinRosenGateway} from '../../../src/server/cards/solaris/EinsteinRosenGateway';
import {SelectColony} from '../../../src/server/inputs/SelectColony';
import {ColonyName} from '../../../src/common/colonies/ColonyName';
import {IGame} from '../../../src/server/IGame';
import {IColony} from '../../../src/server/colonies/IColony';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('EinsteinRosenGateway', () => {
  let card: EinsteinRosenGateway;
  let player: TestPlayer;
  let game: IGame;
  let ganymede: IColony;

  beforeEach(() => {
    card = new EinsteinRosenGateway();
    [game, player] = testGame(1, {
      coloniesExtension: true,
      customColoniesList: [
        ColonyName.GANYMEDE,
        ColonyName.TRITON,
        ColonyName.CERES,
        ColonyName.LEAVITT,
      ],
    });
    ganymede = game.colonies.find((colony) => colony.name === ColonyName.GANYMEDE)!;
  });

  it('cannot play with fewer than 3 colonies', () => {
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 3 colonies', () => {
    for (const colony of game.colonies) {
      colony.addColony(player);
    }
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act during a trade embargo', () => {
    game.tradeEmbargo = true;
    expect(card.canAct(player)).is.false;
  });

  it('trades with a colony for free, without needing an available trade fleet', () => {
    // Use up the player's only trade fleet elsewhere first, to prove this action doesn't
    // require one to be free (matching how Huygens Observatory's free trade works).
    player.colonies.usedTradeFleets = player.colonies.getFleetSize();
    expect(player.colonies.canTrade()).is.false;

    expect(card.canAct(player)).is.true;

    const action = card.action(player);
    const selectColony = cast(action, SelectColony);
    selectColony.cb(ganymede);

    expect(ganymede.visitor).eq(player.id);
  });

  it('scores 3 VP per Galactic tag owned, including this', () => {
    player.tagsForTest = {galactic: 4};
    expect(card.getVictoryPoints(player)).eq(15);
  });
});
