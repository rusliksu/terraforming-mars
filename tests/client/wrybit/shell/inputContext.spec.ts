import {expect} from 'chai';
import {inputContext} from '@/client/wrybit/shell/inputContext';
import {fakeGameModel, fakePlayerViewModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';

describe('Wrybit input context', () => {
  it('ignores clock and other-player refreshes but invalidates changed requests, constraints and own state', () => {
    const input = {type: 'amount' as const, title: 'Select amount', buttonLabel: 'Save', min: 0, max: 5, maxByDefault: false};
    const first = Object.assign(fakePlayerViewModel({waitingFor: input, game: fakeGameModel({gameId: 'g-fixture'})}), {waitingForId: 'pending-a'});
    first.players.push(fakePublicPlayerModel({id: 'p-red-id', color: 'red', name: 'Other player'}));
    const refreshed = structuredClone(first);
    refreshed.thisPlayer.timer.sumElapsed++;
    refreshed.game.gameAge++;
    refreshed.game.inputSeq++;
    refreshed.players[1].name = 'Updated public player';
    expect(inputContext(refreshed)).eq(inputContext(first));

    const newRequest = {...first, waitingForId: 'pending-b'};
    expect(inputContext(newRequest)).not.eq(inputContext(first));
    expect(inputContext({...first, runId: 'restarted-server'})).not.eq(inputContext(first));
    const changedLimit = {...first, waitingFor: {...input, max: 4}};
    expect(inputContext(changedLimit)).not.eq(inputContext(first));
    const changedResources = {...first, thisPlayer: {...first.thisPlayer, heat: first.thisPlayer.heat + 1}};
    expect(inputContext(changedResources)).not.eq(inputContext(first));
    expect(inputContext({...first, game: {...first.game, undoCount: first.game.undoCount + 1}})).not.eq(inputContext(first));
    expect(inputContext({...first, waitingForId: undefined})).eq(undefined);
    expect(inputContext({...first, waitingFor: undefined})).eq(undefined);
  });
});
