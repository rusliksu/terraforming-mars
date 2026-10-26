import {expect} from 'chai';
import {OvdaRegioMassDriver} from '../../../src/server/cards/venusPhase2/OvdaRegioMassDriver';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {GlobalParameter} from '../../../src/common/GlobalParameter';

describe('OvdaRegioMassDriver', () => {
  let card: OvdaRegioMassDriver;
  let player: TestPlayer;

  beforeEach(() => {
    card = new OvdaRegioMassDriver();
    [/* game */, player] = testGame(2, {venusPhase2Expansion: true});
  });

  it('gains 3 heat whenever Venus is increased', () => {
    player.playedCards.push(card);
    expect(player.heat).to.eq(0);

    card.onGlobalParameterIncrease(player, GlobalParameter.VENUS, 1);
    expect(player.heat).to.eq(3);

    card.onGlobalParameterIncrease(player, GlobalParameter.VENUS, 2);
    expect(player.heat).to.eq(9);
  });

  it('does not react to other global parameters', () => {
    player.playedCards.push(card);
    card.onGlobalParameterIncrease(player, GlobalParameter.OXYGEN, 1);
    expect(player.heat).to.eq(0);
  });
});
