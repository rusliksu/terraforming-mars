import {expect} from 'chai';
import {TemplateManager} from '@/client/components/create/TemplateManager';
import {defaultCreateGameModel} from '@/client/components/create/defaultCreateGameModel';
import {JSONObject} from '@/common/Types';

describe('TemplateManager', () => {
  const templatesKey = 'tm_game_templates';

  beforeEach(() => {
    global.localStorage = window.localStorage;
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('omits telegram ids when serializing form state for storage', () => {
    const model = defaultCreateGameModel();
    model.playersCount = 2;
    model.players[0].telegramID = '111';
    model.players[1].telegramID = '222';

    const settings = TemplateManager.serializeFormState(model);
    const players = settings.players as Array<JSONObject>;

    expect(players[0]).not.to.have.property('telegramID');
    expect(players[1]).not.to.have.property('telegramID');
  });

  it('serializes the no-ELO training game flag for storage', () => {
    const model = defaultCreateGameModel();
    model.noEloGame = true;

    const settings = TemplateManager.serializeFormState(model);

    expect(settings.noEloGame).eq(true);
  });

  it('does not persist custom async and bot flags for storage', () => {
    const model = defaultCreateGameModel();
    model.turnBasedGame = true;
    model.botGame = true;
    model.players[0].isBot = true;

    const settings = TemplateManager.serializeFormState(model);
    const players = settings.players as Array<JSONObject>;

    expect(settings.turnBasedGame).eq(false);
    expect(settings.botGame).eq(false);
    expect(players[0].isBot).eq(false);
  });

  it('migrates old templates that already contain telegram ids', () => {
    localStorage.setItem(templatesKey, JSON.stringify([{
      name: 'Private template',
      settings: {
        players: [
          {name: 'Alice', color: 'red', beginner: false, handicap: 0, first: false, isBot: false, telegramID: '111'},
        ],
      },
    }]));

    const templates = TemplateManager.getTemplates();
    const templatePlayers = templates[0].settings.players as Array<JSONObject>;
    const migrated = JSON.parse(localStorage.getItem(templatesKey) ?? '[]');

    expect(templatePlayers[0]).not.to.have.property('telegramID');
    expect(migrated[0].settings.players[0]).not.to.have.property('telegramID');
  });
});
