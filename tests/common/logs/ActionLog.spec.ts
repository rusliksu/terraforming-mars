import {expect} from 'chai';
import {groupActionLogs} from '@/common/logs/ActionLog';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageType} from '@/common/logs/LogMessageType';

describe('ActionLog grouping', () => {
  it('keeps a bounded action together and reports an unfinished action honestly', () => {
    const title = new LogMessage(LogMessageType.DEFAULT, 'Blue played a card', []);
    title.actionId = 'action-1';
    title.actionStart = true;
    const result = new LogMessage(LogMessageType.DEFAULT, 'Blue gained 2 steel', []);
    result.actionId = 'action-1';
    result.effect = {kind: 'resource', resource: 'steel', production: false, amount: 2, player: 'blue'};

    expect(groupActionLogs([title, result])).deep.eq([
      {kind: 'action', id: 'action-1', messages: [title, result], complete: false},
    ]);
    result.actionEnd = true;
    expect(groupActionLogs([title, result])).deep.eq([
      {kind: 'action', id: 'action-1', messages: [title, result], complete: true},
    ]);
  });

  it('leaves historical and mid-action windows as separate original messages', () => {
    const old = new LogMessage(LogMessageType.DEFAULT, 'Old public message', []);
    const middle = new LogMessage(LogMessageType.DEFAULT, 'Blue gained 2 steel', []);
    middle.actionId = 'action-2';
    middle.effect = {kind: 'resource', resource: 'steel', production: false, amount: 2, player: 'blue'};
    const end = new LogMessage(LogMessageType.DEFAULT, 'Blue drew a card', []);
    end.actionId = 'action-2';
    end.actionEnd = true;

    expect(groupActionLogs([old, middle, end])).deep.eq([
      {kind: 'message', message: old},
      {kind: 'message', message: middle},
      {kind: 'message', message: end},
    ]);
  });
});
