import {expect} from 'chai';
import {WildIndustryStandardProject} from '../../../src/server/cards/industries/WildIndustryStandardProject';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {runAllActions, fakeCard} from '../../TestingUtils';
import {Payment} from '../../../src/common/inputs/Payment';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectOption} from '../../../src/server/inputs/SelectOption';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {Tag} from '../../../src/common/cards/Tag';
import {TileType} from '../../../src/common/TileType';
import {cast} from '../../../src/common/utils/utils';

describe('WildIndustryStandardProject', () => {
  let card: WildIndustryStandardProject;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    [game, player] = testGame(1, {industriesExpansion: true});
    card = new WildIndustryStandardProject();
    player.megaCredits = card.cost;
    player.playedCards.push(fakeCard({tags: [Tag.POWER]}));
  });

  it('costs 18 M€', () => {
    expect(card.cost).eq(18);
  });

  it('lets the player choose which production to raise, then places a tile and distributes that resource', () => {
    card.payAndExecute(player, Payment.of({megacredits: card.cost}));
    runAllActions(game);

    const orOptions = cast(player.popWaitingFor(), OrOptions);
    const titaniumOption = cast(
      orOptions.options.find((option) => option instanceof SelectOption && option.title.toString().toLowerCase().includes('titanium')),
      SelectOption,
    );
    cast(titaniumOption.cb(undefined), undefined);
    runAllActions(game);

    const placeTile = cast(player.popWaitingFor(), SelectSpace);
    const space = placeTile.spaces[0];
    cast(placeTile.cb(space), undefined);

    expect(space.tile?.tileType).eq(TileType.INDUSTRY_WILD);
    expect(player.production.titanium).eq(1);
    expect(player.industryTilesPlaced).eq(1);

    runAllActions(game);
    const distribute = cast(player.popWaitingFor(), SelectSpace);
    expect(distribute).instanceOf(SelectSpace);
  });
});
