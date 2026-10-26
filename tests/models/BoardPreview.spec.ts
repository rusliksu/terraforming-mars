import {expect} from 'chai';
import {createBoardPreview} from '../../src/server/models/BoardPreview';
import {BoardName} from '../../src/common/boards/BoardName';
import {RandomBoardOption} from '../../src/common/boards/RandomBoardOption';
import {DEFAULT_EXPANSIONS} from '../../src/common/cards/GameModule';
import {ConstRandom} from '../../src/common/utils/Random';
import {SpaceType} from '../../src/common/boards/SpaceType';

describe('public board preview', () => {
  it('samples only our native board choices and labels the random choice as an example', () => {
    const request = {board: RandomBoardOption.OFFICIAL, seed: 0.2, shuffleMapOption: false,
      expansions: {...DEFAULT_EXPANSIONS}, includedCards: []};
    expect(createBoardPreview(request, new ConstRandom(0)).boardName).eq(BoardName.THARSIS);
    const last = createBoardPreview(request, new ConstRandom(0.99));
    expect(last.boardName).eq(BoardName.ELYSIUM);
    expect(last.randomExample).is.true;
    expect(request.board).eq(RandomBoardOption.OFFICIAL);
    const all = createBoardPreview({...request, board: RandomBoardOption.ALL}, new ConstRandom(0.99));
    expect(all.boardName).eq(BoardName.HOLLANDIA);
  });

  it('uses our seeded shuffle without changing the request or the board space set', () => {
    const request = {board: BoardName.THARSIS, seed: 0.25, shuffleMapOption: false,
      expansions: {...DEFAULT_EXPANSIONS}, includedCards: []};
    const before = JSON.stringify(request);
    const original = createBoardPreview(request);
    const shuffled = createBoardPreview({...request, shuffleMapOption: true});
    expect(createBoardPreview({...request, shuffleMapOption: true})).deep.eq(shuffled);
    expect(shuffled.spaces.map((space) => space.id)).deep.eq(original.spaces.map((space) => space.id));
    expect(shuffled.spaces.filter((space) => space.spaceType === SpaceType.OCEAN)).has.length(12);
    expect(shuffled.spaces).not.deep.eq(original.spaces);
    expect(shuffled.spaces.filter((space) => space.highlight)).deep.eq(original.spaces.filter((space) => space.highlight));
    expect(JSON.stringify(request)).eq(before);
  });
});
