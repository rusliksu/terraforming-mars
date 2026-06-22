import {expect} from 'chai';
import {CreateGameSettingsStorage} from '@/client/components/create/CreateGameSettingsStorage';
import {FakeLocalStorage} from '../FakeLocalStorage';

describe('CreateGameSettingsStorage', () => {
  let localStorage: FakeLocalStorage;
  let storage: CreateGameSettingsStorage;

  beforeEach(() => {
    localStorage = new FakeLocalStorage();
    storage = new CreateGameSettingsStorage(localStorage);
  });

  it('saves and reloads game settings', () => {
    storage.saveSettings({
      players: [{name: 'Alice', color: 'red', beginner: false, handicap: 0}],
      board: 'hellas',
      solarPhaseOption: true,
    });

    expect(storage.loadSettings()).deep.eq({
      players: [{name: 'Alice', color: 'red', beginner: false, handicap: 0, isBot: false}],
      board: 'hellas',
      solarPhaseOption: true,
      turnBasedGame: false,
      botGame: false,
    });
  });

  it('sanitizes transient custom fields before saving settings', () => {
    storage.saveSettings({
      turnBasedGame: true,
      botGame: true,
      clonedGamedId: 'g123',
      players: [
        {name: 'Alice', color: 'red', beginner: false, handicap: 0, first: false, isBot: true, telegramID: '111'},
      ],
    });

    const settings = storage.loadSettings()!;
    const players = settings.players as Array<Record<string, unknown>>;

    expect(settings.turnBasedGame).eq(false);
    expect(settings.botGame).eq(false);
    expect(settings).not.to.have.property('clonedGamedId');
    expect(players[0]).not.to.have.property('telegramID');
    expect(players[0].isBot).eq(false);
  });

  it('migrates old settings that already contain transient custom fields', () => {
    localStorage.setItem('tm_last_settings', JSON.stringify({
      clonedGameId: 'g123',
      players: [
        {name: 'Alice', color: 'red', beginner: false, handicap: 0, first: false, isBot: false, telegramID: '111'},
      ],
    }));

    const settings = storage.loadSettings()!;
    const players = settings.players as Array<Record<string, unknown>>;
    const migrated = JSON.parse(localStorage.getItem('tm_last_settings') ?? '{}');

    expect(settings).not.to.have.property('clonedGameId');
    expect(players[0]).not.to.have.property('telegramID');
    expect(migrated).not.to.have.property('clonedGameId');
    expect(migrated.players[0]).not.to.have.property('telegramID');
  });

  it('ignores invalid saved data', () => {
    const warnings: Array<Array<unknown>> = [];
    const originalWarn = console.warn;
    console.warn = (...args) => {
      warnings.push(args);
    };
    localStorage.setItem('tm_last_settings', '{bad json');

    try {
      expect(storage.loadSettings()).eq(undefined);
    } finally {
      console.warn = originalWarn;
    }
    expect(warnings[0][0]).eq('Unable to load create game settings:');
  });

  it('clears saved settings', () => {
    storage.saveSettings({
      players: [{name: 'Alice', color: 'red', beginner: false, handicap: 0}],
      board: 'hellas',
      solarPhaseOption: true,
    });

    storage.clearSettings();

    expect(storage.loadSettings()).eq(undefined);
  });
});
