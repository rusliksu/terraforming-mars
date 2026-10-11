import {expect} from 'chai';
import {logSearchText} from '@/client/components/logpanel/logSearchText';
import {CardName} from '@/common/cards/CardName';
import {LogMessage} from '@/common/logs/LogMessage';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {LogMessageType} from '@/common/logs/LogMessageType';
import {PartyName} from '@/common/turmoil/PartyName';
import {fakePublicPlayerModel} from '../testHelpers';

describe('logSearchText', () => {
  it('formats translated messages, cards, parties and player names without mutating logs', () => {
    const message = new LogMessage(LogMessageType.DEFAULT, '${0} played ${1} with ${2}', [
      {type: LogMessageDataType.PLAYER, value: 'blue'},
      {type: LogMessageDataType.CARD, value: CardName.ENERGY_SAVING},
      {type: LogMessageDataType.PARTY, value: PartyName.GREENS},
    ]);
    const translations: Record<string, string> = {
      '${0} played ${1} with ${2}': '${0} сыграл ${1} с ${2}',
      'Energy Saving': 'Энергосбережение',
      'Greens': 'Зелёные',
    };
    const original = JSON.stringify(message);
    const players = [fakePublicPlayerModel({color: 'blue', name: 'Руслан'})];
    expect(logSearchText(message, players, (text) => translations[text] ?? text)).eq('руслан сыграл энергосбережение с зелёные');
    expect(logSearchText(message, players, (text) => text)).eq('руслан played energy saving with greens');
    expect(JSON.stringify(message)).eq(original);
  });

  it('omits truncated cards, unused data and private metadata from search text', () => {
    const message = new LogMessage(LogMessageType.DEFAULT, 'Drafted ${0}', [
      {type: LogMessageDataType.CARDS, value: [CardName.ENERGY_SAVING], attrs: {ellipsis: true}},
      {type: LogMessageDataType.CARD, value: CardName.STANDARD_TECHNOLOGY},
    ], 'p-metadata');
    expect(logSearchText(message, [], (text) => text)).eq('drafted ...');
    message.data[0].attrs = undefined;
    expect(logSearchText(message, [], (text) => text)).eq('drafted energy saving');
  });
});
