import {expect} from 'chai';
import {FloatingHabs} from '../../src/server/cards/venusNext/FloatingHabs';
import {CloudSocieties} from '../../src/server/turmoil/globalEvents/CloudSocieties';
import {Kelvinists} from '../../src/server/turmoil/parties/Kelvinists';
import {testGame} from '../TestingUtils';

describe('CloudSocieties', () => {
  it('resolve play', () => {
    const card = new CloudSocieties();
    const [game, player] = testGame(1, {turmoilExtension: true});
    const turmoil = game.turmoil!;
    const floatingHabs = new FloatingHabs();
    player.playedCards.push(floatingHabs);
    turmoil.chairman = player;
    turmoil.dominantParty = new Kelvinists();
    turmoil.dominantParty.partyLeader = player;
    turmoil.dominantParty.delegates.add(player);
    card.resolve(game, turmoil);
    expectLog(game, floatingHabs.name, '1');
    game.deferredActions.runNext();

    expect(floatingHabs.resourceCount).to.eq(3);
  });
});

function expectLog(game: ReturnType<typeof testGame>[0], cardName: string, amount: string) {
  const log = game.gameLog.find((message) =>
    message.message === '${0} added ${1} ${2} to ${3}' &&
    message.data[1]?.value === amount &&
    message.data[3]?.value === cardName);
  expect(log).is.not.undefined;
}
