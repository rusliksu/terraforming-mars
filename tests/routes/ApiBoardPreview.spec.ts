import {expect} from 'chai';
import {ApiBoardPreview} from '../../src/server/routes/ApiBoardPreview';
import {MockResponse} from './HttpMocks';
import {RouteTestScaffolding} from './RouteTestScaffolding';
import {BoardName} from '../../src/common/boards/BoardName';
import {DEFAULT_EXPANSIONS} from '../../src/common/cards/GameModule';
import {blankCustomBoard} from '../../src/common/boards/CustomBoardDefinition';
import {encodeCustomBoard} from '../../src/common/boards/customBoardCodec';
import {SpaceType} from '../../src/common/boards/SpaceType';
import {SpaceBonus} from '../../src/common/boards/SpaceBonus';
import {BoardPreviewModel} from '../../src/common/models/BoardPreviewModel';
import {DEFAULT_GLOBAL_PARAMETERS} from '../../src/common/GlobalParameterConfig';

async function preview(body: unknown) {
  const scaffolding = new RouteTestScaffolding();
  // This read-only projection must never reach a game loader.
  scaffolding.ctx.gameLoader = new Proxy(scaffolding.ctx.gameLoader, {get() {
    throw new Error('Preview touched game storage');
  }});
  const response = new MockResponse();
  const pending = scaffolding.post(ApiBoardPreview.INSTANCE, response);
  scaffolding.req.emitString(JSON.stringify(body));
  scaffolding.req.emitter.emit('end');
  await pending;
  return response;
}

const options = {board: BoardName.THARSIS, seed: 0.25, shuffleMapOption: false,
  expansions: {...DEFAULT_EXPANSIONS}, includedCards: []};

describe('ApiBoardPreview', () => {
  it('returns our public Tharsis geometry without creating or loading a game', async () => {
    const response = await preview(options);
    expect(response.statusCode).eq(200);
    const model: BoardPreviewModel = JSON.parse(response.content);
    const mars = model.spaces.filter((space) => space.spaceType !== SpaceType.COLONY);
    expect(mars).has.length(61);
    expect(mars.filter((space) => space.spaceType === SpaceType.OCEAN)).has.length(12);
    expect(mars[0]).deep.eq({id: '03', x: 4, y: 0, a9: 'A1', spaceType: SpaceType.LAND, bonus: [SpaceBonus.STEEL, SpaceBonus.STEEL]});
    expect(mars.find((space) => space.highlight === 'noctis')?.id).eq('31');
    expect(model.randomExample).is.false;
    expect(Object.keys(model)).deep.eq(['boardName', 'spaces', 'randomExample']);
  });

  it('uses our custom outline and track settings and reports invalid requests as400', async () => {
    const custom = blankCustomBoard(5, 'Synthetic preview');
    custom.spaces.splice(0, 1);
    custom.globalParameters = {...DEFAULT_GLOBAL_PARAMETERS, oxygen: {...DEFAULT_GLOBAL_PARAMETERS.oxygen, max: 16}};
    const response = await preview({...options, board: BoardName.CUSTOM, customBoardCode: encodeCustomBoard(custom)});
    expect(response.statusCode).eq(200);
    const model: BoardPreviewModel = JSON.parse(response.content);
    expect(model.customBoardRows).eq(5);
    expect(model.globalParameters?.oxygen.max).eq(16);
    expect(model.spaces.filter((space) => space.spaceType !== SpaceType.COLONY)).has.length(18);
    expect(model.spaces.some((space) => space.id === custom.spaces[0].id)).is.true;
    for (const invalid of [null, {...options, board: 'unknown'}, {...options, seed: -1},
      {...options, expansions: {ares: 'yes'}}, {...options, includedCards: ['not-a-card']},
      {...options, board: BoardName.CUSTOM, customBoardCode: 'broken'}]) {
      expect((await preview(invalid)).statusCode).eq(400);
    }
  });
});
