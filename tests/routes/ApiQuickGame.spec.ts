import {expect} from 'chai';
import {BoardName} from '../../src/common/boards/BoardName';
import {DEFAULT_EXPANSIONS} from '../../src/common/cards/GameModule';
import * as constants from '../../src/common/constants';
import {statusCode} from '../../src/common/http/statusCode';
import {GameId} from '../../src/common/Types';
import {ApiQuickGame} from '../../src/server/routes/ApiQuickGame';
import {MockRequest, MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';

type QuickGameModel = {
  id: GameId;
  playerCount: number;
  template: string;
};

type TemplateEntry = {
  name: string;
  settings: Record<string, unknown>;
};

describe('ApiQuickGame', () => {
  let scaffolding: RouteTestScaffolding;
  let req: MockRequest;
  let res: MockResponse;
  let apiQuickGame: ApiQuickGame;

  beforeEach(() => {
    req = new MockRequest();
    res = new MockResponse();
    scaffolding = new RouteTestScaffolding(req);
    apiQuickGame = new ApiQuickGame();
  });

  function setTemplates(templates: Array<TemplateEntry>) {
    (apiQuickGame as unknown as {templates: Array<TemplateEntry> | undefined}).templates = templates;
  }

  it('creates games with one-way 10-card initial draft enabled', async () => {
    setTemplates([{
      name: 'One-way draft',
      settings: {
        board: BoardName.THARSIS,
        draftVariant: true,
        expansions: DEFAULT_EXPANSIONS,
        initialDraft: true,
        initialDraftOneWay: true,
        randomFirstPlayer: false,
      },
    }]);
    scaffolding.url = '/api/quickgame?template=One-way%20draft&players=2';

    await scaffolding.get(apiQuickGame, res);

    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as QuickGameModel;
    expect(model.template).eq('One-way draft');
    expect(model.playerCount).eq(2);
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(game).is.not.undefined;
    expect(game!.gameOptions.initialDraftVariant).eq(true);
    expect(game!.gameOptions.initialDraftOneWay).eq(true);
  });

  it('ignores one-way 10-card initial draft when initial draft is disabled', async () => {
    setTemplates([{
      name: 'Regular draft',
      settings: {
        board: BoardName.THARSIS,
        draftVariant: true,
        expansions: DEFAULT_EXPANSIONS,
        initialDraft: false,
        initialDraftOneWay: true,
        randomFirstPlayer: false,
      },
    }]);
    scaffolding.url = '/api/quickgame?template=Regular%20draft&players=2';

    await scaffolding.get(apiQuickGame, res);

    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as QuickGameModel;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(game).is.not.undefined;
    expect(game!.gameOptions.initialDraftVariant).eq(false);
    expect(game!.gameOptions.initialDraftOneWay).eq(false);
  });

  it('normalizes malformed escape velocity template settings to defaults', async () => {
    setTemplates([{
      name: 'Bad EV',
      settings: {
        board: BoardName.THARSIS,
        expansions: DEFAULT_EXPANSIONS,
        escapeVelocityMode: true,
        escapeVelocityThreshold: -9999,
        escapeVelocityBonusSeconds: -9999,
        escapeVelocityPeriod: -12,
        escapeVelocityPenalty: 999999,
      },
    }]);
    scaffolding.url = '/api/quickgame?template=Bad%20EV&players=2';

    await scaffolding.get(apiQuickGame, res);

    expect(res.statusCode).eq(statusCode.ok);
    const model = JSON.parse(res.content) as QuickGameModel;
    const game = await scaffolding.ctx.gameLoader.getGame(model.id);
    expect(game).is.not.undefined;
    expect(game!.gameOptions.escapeVelocity).deep.eq({
      thresholdMinutes: constants.DEFAULT_ESCAPE_VELOCITY_THRESHOLD,
      bonusSectionsPerAction: constants.DEFAULT_ESCAPE_VELOCITY_BONUS_SECONDS,
      penaltyPeriodMinutes: constants.DEFAULT_ESCAPE_VELOCITY_PERIOD,
      penaltyVPPerPeriod: constants.DEFAULT_ESCAPE_VELOCITY_PENALTY,
    });
  });
});
