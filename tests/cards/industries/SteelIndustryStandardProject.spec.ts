import {expect} from 'chai';
import {SteelIndustryStandardProject} from '../../../src/server/cards/industries/SteelIndustryStandardProject';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {runAllActions, fakeCard} from '../../TestingUtils';
import {Payment} from '../../../src/common/inputs/Payment';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {Tag} from '../../../src/common/cards/Tag';
import {TileType} from '../../../src/common/TileType';
import {cast} from '../../../src/common/utils/utils';

describe('SteelIndustryStandardProject', () => {
  let card: SteelIndustryStandardProject;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    [game, player] = testGame(1, {industriesExpansion: true});
    card = new SteelIndustryStandardProject();
    player.megaCredits = card.cost;
    player.playedCards.push(fakeCard({tags: [Tag.POWER]}));
  });

  it('costs 10 M€', () => {
    expect(card.cost).eq(10);
  });

  it('places a tile and raises steel production', () => {
    card.payAndExecute(player, Payment.of({megacredits: card.cost}));
    runAllActions(game);

    const placeTile = cast(player.popWaitingFor(), SelectSpace);
    const space = placeTile.spaces[0];
    cast(placeTile.cb(space), undefined);

    expect(space.tile?.tileType).eq(TileType.INDUSTRY_STEEL);
    expect(player.production.steel).eq(1);
    expect(player.industryTilesPlaced).eq(1);
  });
});
