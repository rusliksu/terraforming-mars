import {expect} from 'chai';
import {PowerPlantStandardProject} from '../../../src/server/cards/base/standardProjects/PowerPlantStandardProject';
import {Manutech} from '../../../src/server/cards/venusNext/Manutech';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {Payment} from '../../../src/common/inputs/Payment';
import {Resource} from '../../../src/common/Resource';
import {formatMessage} from '../../TestingUtils';

describe('Manutech', () => {
  let card: Manutech;
  let player: TestPlayer;

  beforeEach(() => {
    card = new Manutech();
    [, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('Should play', () => {
    card.play(player);
    expect(player.production.steel).to.eq(1);
    expect(player.steel).to.eq(1);
  });

  it('Logs the resources gained from a production increase', () => {
    player.production.add(Resource.HEAT, 4, {log: true});
    expect(player.heat).to.eq(4);
    const messages = player.game.gameLog.filter((message) => message.message === '${0} gained ${1}${2} because of ${3}');
    expect(messages).has.length(1);
    expect(formatMessage(messages[0])).eq('blue gained 4:r:heat: because of Manutech');
  });

  it('Should add energy resources by Power Plant standard project', () => {
    player.megaCredits = 11;
    new PowerPlantStandardProject().payAndExecute(player, Payment.of({megacredits: 11}));
    expect(player.energy).to.eq(1);
  });
});
