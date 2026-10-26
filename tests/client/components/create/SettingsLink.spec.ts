import {expect} from 'chai';
import {defaultCreateGameModel} from '@/client/components/create/defaultCreateGameModel';
import {encodeSettingsHash, decodeSettingsHash} from '@/client/components/create/settingsLink';
import {JSONProcessor} from '@/client/components/create/JSONProcessor';
import {CardName} from '@/common/cards/CardName';
import {BoardName} from '@/common/boards/BoardName';
import {encodeCustomBoard} from '@/common/boards/customBoardCodec';
import {blankCustomBoard} from '@/common/boards/CustomBoardDefinition';

describe('our public settings links', () => {
  it('round-trips our setup through the native importer without names, profiles, contacts or automation', () => {
    const model = defaultCreateGameModel();
    model.playersCount = 2;
    model.players[0] = {...model.players[0], name: 'Synthetic private name', profileId: 'synthetic-profile', telegramID: '500001111', isBot: true};
    model.players[1].name = 'Другой synthetic player';
    model.turnBasedGame = true;
    model.botGame = true;
    model.firstIndex = 2;
    model.seed = 0.25;
    model.board = BoardName.CUSTOM;
    model.customBoardCode = encodeCustomBoard(blankCustomBoard(5, 'Синтетическая карта'));
    model.expansions.highOrbit = true;
    model.expansions.rebalanced = true;
    model.undoStepOption = true;
    model.bannedCards = [CardName.ASTEROID];
    const before = JSON.stringify(model);
    const hash = encodeSettingsHash(model);
    const settings = decodeSettingsHash(hash)!;
    const text = JSON.stringify(settings);
    expect(text).not.contains('Synthetic private name');
    expect(text).not.contains('Другой');
    expect(text).not.contains('synthetic-profile');
    expect(text).not.contains('500001111');
    expect(text).not.contains('profileId');
    expect(text).not.contains('telegramID');
    expect(settings.botGame).eq(false);
    expect(settings.turnBasedGame).eq(false);
    expect(settings.firstIndex).eq(2);
    expect(settings.seed).eq(0.25);
    const restored = defaultCreateGameModel();
    new JSONProcessor(restored).applyJSON(settings);
    expect(restored.expansions.highOrbit).is.true;
    expect(restored.expansions.rebalanced).is.true;
    expect(restored.undoStepOption).is.true;
    expect(restored.customBoardCode).eq(model.customBoardCode);
    expect(restored.bannedCards).deep.eq([CardName.ASTEROID]);
    expect(restored.playersCount).eq(2);
    expect(restored.players.every((player) => player.isBot === false)).is.true;
    expect(JSON.stringify(model)).eq(before);
  });

  it('ignores unrelated anchors and rejects malformed or non-public settings before import', () => {
    expect(decodeSettingsHash('#board')).eq(undefined);
    const hash = encodeSettingsHash(defaultCreateGameModel());
    const settings = decodeSettingsHash(hash)!;
    const raw = (value: unknown) => '#tm-settings=1.' + btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    for (const invalid of ['#tm-settings=2.abc', '#tm-settings=1.invalid!',
      raw({...settings, botGame: true}), raw({...settings, turnBasedGame: true}), raw({...settings, clonedGameId: 'g-synthetic-private'}),
      raw({...settings, expansions: {highOrbit: 'true'}}), raw({...settings, board: 'not-a-board'}),
      raw({...settings, seed: -1}), raw({...settings, bannedCards: 'Asteroid'}),
      raw({...settings, players: [{name: '', color: 'red', beginner: false, handicap: 0, first: false, isBot: true}]}),
      raw({...settings, players: [{name: 'Private name', color: 'red', beginner: false, handicap: 0, first: false, isBot: false}]}),
      raw({...settings, players: [{name: '', color: 'red', beginner: false, handicap: 0, first: false, isBot: false, profileId: 'synthetic-profile'}]}),
      raw(JSON.parse('{"__proto__":{"polluted":true}}'))]) {
      expect(() => decodeSettingsHash(invalid)).throws();
    }
  });
});
