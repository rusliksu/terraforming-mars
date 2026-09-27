import {expect} from 'chai';
import {MoneyIndustryStandardProject} from '../../../src/server/cards/industries/MoneyIndustryStandardProject';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {runAllActions, fakeCard} from '../../TestingUtils';
import {Payment} from '../../../src/common/inputs/Payment';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {Tag} from '../../../src/common/cards/Tag';
import {TileType} from '../../../src/common/TileType';
import {cast} from '../../../src/common/utils/utils';

describe('MoneyIndustryStandardProject', () => {
  let card: MoneyIndustryStandardProject;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    [game, player] = testGame(1, {industriesExpansion: true});
    card = new MoneyIndustryStandardProject();
    player.megaCredits = card.cost;
    player.playedCards.push(fakeCard({tags: [Tag.POWER]}));
  });

  it('costs 8 M€', () => {
    expect(card.cost).eq(8);
  });

  it('places a tile and raises M€ production', () => {
    card.payAndExecute(player, Payment.of({megacredits: card.cost}));
    runAllActions(game);

    const placeTile = cast(player.popWaitingFor(), SelectSpace);
    const space = placeTile.spaces[0];
    cast(placeTile.cb(space), undefined);

    expect(space.tile?.tileType).eq(TileType.INDUSTRY_MONEY);
    expect(player.production.megacredits).eq(1);
    expect(player.industryTilesPlaced).eq(1);
  });
});
