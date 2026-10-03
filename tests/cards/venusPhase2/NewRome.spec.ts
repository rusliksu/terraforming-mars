import {expect} from 'chai';
import {NewRome} from '../../../src/server/cards/venusPhase2/NewRome';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {TileType} from '../../../src/common/TileType';
import {PartyName} from '../../../src/common/turmoil/PartyName';
import {Turmoil} from '../../../src/server/turmoil/Turmoil';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {SelectParty} from '../../../src/server/inputs/SelectParty';
import {cast} from '../../../src/common/utils/utils';

describe('NewRome', () => {
  let card: NewRome;
  let game: IGame;
  let player: TestPlayer;
  let turmoil: Turmoil;

  beforeEach(() => {
    card = new NewRome();
    [game, player] = testGame(2, {venusPhase2Expansion: true, turmoilExtension: true});
    turmoil = game.turmoil!;
  });

  it('requires Venus 16%', () => {
    expect(card.canPlay(player)).is.false;
    for (let i = 0; i < 6; i++) {
      game.increaseVenusScaleLevel(player, 3);
    }
    expect(card.canPlay(player)).is.true;
  });

  it('raises Venus and places a Venus Habitat tile on Venus', () => {
    for (let i = 0; i < 6; i++) {
      game.increaseVenusScaleLevel(player, 3);
    }
    const venusBefore = game.getVenusScaleLevel();
    card.play(player);
    runAllActions(game);
    expect(game.getVenusScaleLevel()).to.eq(venusBefore + 2);

    const selectSpace = cast(player.popWaitingFor(), SelectSpace);
    const target = selectSpace.spaces[0];
    selectSpace.cb(target);
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    expect(venusSurface.getSpaceOrThrow(target.id).tile?.tileType).to.eq(TileType.VENUS_CLOUD_CITY);
  });

  it('cannot act without leading a party', () => {
    expect(card.canAct(player)).is.false;
  });

  it('adds a delegate to a party the player leads', () => {
    const greens = turmoil.getPartyByName(PartyName.GREENS);
    greens.partyLeader = player;
    expect(card.canAct(player)).is.true;

    card.action(player);
    runAllActions(game);
    const selectParty = cast(player.popWaitingFor(), SelectParty);
    expect(selectParty.parties).to.deep.eq([PartyName.GREENS]);

    const delegatesBefore = greens.delegates.count(player);
    selectParty.cb(PartyName.GREENS);
    expect(greens.delegates.count(player)).to.eq(delegatesBefore + 1);
  });
});
