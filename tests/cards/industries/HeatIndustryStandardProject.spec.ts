import {expect} from 'chai';
import {HeatIndustryStandardProject} from '../../../src/server/cards/industries/HeatIndustryStandardProject';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {runAllActions, fakeCard} from '../../TestingUtils';
import {Payment} from '../../../src/common/inputs/Payment';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {Tag} from '../../../src/common/cards/Tag';
import {TileType} from '../../../src/common/TileType';
import {cast} from '../../../src/common/utils/utils';

describe('HeatIndustryStandardProject', () => {
  let card: HeatIndustryStandardProject;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    [game, player] = testGame(1, {industriesExpansion: true});
    card = new HeatIndustryStandardProject();
    player.megaCredits = card.cost;
  });

  it('costs 6 M€', () => {
    expect(card.cost).eq(6);
  });

  it('cannot act without a Power tag exceeding tiles already placed', () => {
    expect(card.canAct(player)).is.false;
  });

  it('can act once Power tag count exceeds industry tiles placed', () => {
    player.playedCards.push(fakeCard({tags: [Tag.POWER]}));
    expect(card.canAct(player)).is.true;
  });

  it('cannot act once the 13-tile cap is reached, regardless of Power tags', () => {
    player.playedCards.push(fakeCard({tags: [Tag.POWER]}), fakeCard({tags: [Tag.POWER]}));
    player.industryTilesPlaced = 13;
    expect(card.canAct(player)).is.false;
  });

  it('places a tile, raises heat production, and defers a heat distribution', () => {
    player.playedCards.push(fakeCard({tags: [Tag.POWER]}));
    card.payAndExecute(player, Payment.of({megacredits: card.cost}));
    runAllActions(game);

    const placeTile = cast(player.popWaitingFor(), SelectSpace);
    const space = placeTile.spaces[0];
    cast(placeTile.cb(space), undefined);

    expect(space.tile?.tileType).eq(TileType.INDUSTRY_HEAT);
    expect(player.production.heat).eq(1);
    expect(player.industryTilesPlaced).eq(1);

    runAllActions(game);
    const distribute = cast(player.popWaitingFor(), SelectSpace);
    expect(distribute).instanceOf(SelectSpace);
  });
});
