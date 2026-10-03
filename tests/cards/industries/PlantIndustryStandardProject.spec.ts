import {expect} from 'chai';
import {PlantIndustryStandardProject} from '../../../src/server/cards/industries/PlantIndustryStandardProject';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {runAllActions, fakeCard} from '../../TestingUtils';
import {Payment} from '../../../src/common/inputs/Payment';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {Tag} from '../../../src/common/cards/Tag';
import {TileType} from '../../../src/common/TileType';
import {cast} from '../../../src/common/utils/utils';

describe('PlantIndustryStandardProject', () => {
  let card: PlantIndustryStandardProject;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    [game, player] = testGame(1, {industriesExpansion: true});
    card = new PlantIndustryStandardProject();
    player.megaCredits = card.cost;
    player.playedCards.push(fakeCard({tags: [Tag.POWER]}));
  });

  it('costs 14 M€', () => {
    expect(card.cost).eq(14);
  });

  it('places a tile and raises plant production', () => {
    card.payAndExecute(player, Payment.of({megacredits: card.cost}));
    runAllActions(game);

    const placeTile = cast(player.popWaitingFor(), SelectSpace);
    const space = placeTile.spaces[0];
    cast(placeTile.cb(space), undefined);

    expect(space.tile?.tileType).eq(TileType.INDUSTRY_PLANT);
    expect(player.production.plants).eq(1);
    expect(player.industryTilesPlaced).eq(1);
  });
});
