import {expect} from 'chai';
import {milestoneAwardChoices} from '@/client/wrybit/inputs/milestoneAwardChoice';
import {partyChoices} from '@/client/wrybit/inputs/partyChoice';
import {fakeGameModel} from '@tests/client/components/testHelpers';
import {PartyName} from '@/common/turmoil/PartyName';
import {LogMessageDataType} from '@/common/logs/LogMessageDataType';
import {OrOptionsModel} from '@/common/models/PlayerInputModel';

describe('native metadata prompt matchers', () => {
  it('matches Vitor award message values to this game and declines unknown titles or names', () => {
    const game = fakeGameModel({awards: [
      {name: 'Landlord', playerName: undefined, color: undefined, scores: []},
      {name: 'Miner', playerName: undefined, color: undefined, scores: []},
    ]});
    const input: OrOptionsModel = {type: 'or', title: 'Select award to fund', buttonLabel: 'Confirm', options: [
      {type: 'option', title: {message: 'Fund ${0} award', data: [{type: LogMessageDataType.AWARD, value: 'Landlord'}]}, buttonLabel: 'Confirm'},
      {type: 'option', title: 'Miner', buttonLabel: 'Confirm'},
    ]};
    const result = milestoneAwardChoices(input, game)!;
    expect(result.kind).eq('awards');
    expect(result.choices.map((choice) => [choice.index, choice.award?.name])).deep.eq([[0, 'Landlord'], [1, 'Miner']]);
    expect(milestoneAwardChoices({...input, title: 'Other award decision'}, game)).eq(undefined);
    expect(milestoneAwardChoices({...input, options: [{type: 'option', title: 'Unknown award', buttonLabel: 'Confirm'}]}, game)).eq(undefined);
    expect(milestoneAwardChoices({...input, options: [{type: 'option', title: {message: 'Other ${0}',
      data: [{type: LogMessageDataType.AWARD, value: 'Landlord'}]}, buttonLabel: 'Confirm'}]}, game)).eq(undefined);
  });

  it('keeps explicit allied descriptions and declines ambiguous or duplicate stays-here choices', () => {
    const cards = Object.values(PartyName).map((name) => ({party: {name, partyLeader: undefined, delegates: []},
      bonusText: undefined, policyText: undefined}));
    const allied = partyChoices([
      {type: 'option', title: `[${PartyName.KELVINISTS}] - Bonus: Synthetic bonus -  Policy: Synthetic policy`, buttonLabel: 'Select'},
      {type: 'option', title: PartyName.REDS, buttonLabel: 'Select'},
    ], cards)!;
    expect(allied[0].card.bonusText).eq('Synthetic bonus');
    expect(allied[0].card.policyText).eq('Synthetic policy');
    expect(allied[0].card.party.name).eq(PartyName.KELVINISTS);
    const stay = {type: 'option', title: 'Do not move', buttonLabel: 'Select'} as const;
    expect(partyChoices([stay, {type: 'option', title: PartyName.REDS, buttonLabel: 'Select'}], cards)).eq(undefined);
    expect(partyChoices([stay, stay], cards)).eq(undefined);
    expect(partyChoices([{type: 'option', title: PartyName.REDS, buttonLabel: 'Select'},
      {type: 'option', title: PartyName.REDS, buttonLabel: 'Select'}], cards)).eq(undefined);
  });
});
