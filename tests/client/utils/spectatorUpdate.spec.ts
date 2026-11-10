import {expect} from 'chai';
import type {SpectatorModel} from '@/common/models/SpectatorModel';
import {fakeGameModel, fakePublicPlayerModel} from '@tests/client/components/testHelpers';
import {shouldReplaceSpectator} from '@/client/utils/spectatorUpdate';

function spectator(overrides: {inputSeq?: number, undoCount?: number, phase?: string, generation?: number, step?: number, gameId?: string} = {}): SpectatorModel {
  return {
    id: 's-test',
    color: 'neutral',
    game: fakeGameModel({
      gameId: overrides.gameId ?? 'g-test',
      inputSeq: overrides.inputSeq ?? 10,
      undoCount: overrides.undoCount ?? 1,
      phase: overrides.phase ?? 'action',
      generation: overrides.generation ?? 5,
      step: overrides.step ?? 2,
    } as any),
    players: [fakePublicPlayerModel({color: 'red', name: 'Red'})],
  } as unknown as SpectatorModel;
}

describe('shouldReplaceSpectator', () => {
  it('keeps the existing view when only the polling response is new', () => {
    const previous = spectator();
    const next = spectator();
    expect(shouldReplaceSpectator(previous, next)).is.false;
  });

  it('replaces the view on real game changes', () => {
    const previous = spectator();
    expect(shouldReplaceSpectator(previous, spectator({inputSeq: 11}))).is.true;
    expect(shouldReplaceSpectator(previous, spectator({undoCount: 2}))).is.true;
    expect(shouldReplaceSpectator(previous, spectator({phase: 'end'}))).is.true;
    expect(shouldReplaceSpectator(previous, spectator({generation: 6}))).is.true;
    expect(shouldReplaceSpectator(previous, spectator({step: 3}))).is.true;
    expect(shouldReplaceSpectator(previous, spectator({gameId: 'g-other'}))).is.true;
  });

  it('always replaces the first model', () => {
    expect(shouldReplaceSpectator(undefined, spectator())).is.true;
  });
});
