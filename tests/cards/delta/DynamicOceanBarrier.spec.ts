import {expect} from 'chai';
import {CardType} from '../../../src/common/cards/CardType';
import {DynamicOceanBarrier} from '../../../src/server/cards/delta/DynamicOceanBarrier';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {IGame} from '../../../src/server/IGame';
import {addOcean, runAllActions} from '../../TestingUtils';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast} from '../../../src/common/utils/utils';

describe('DynamicOceanBarrier', () => {
  let card: DynamicOceanBarrier;
  let game: IGame;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new DynamicOceanBarrier();
    [game, player, player2] = testGame(2, {deltaProjectExpansion: true});
    player.playedCards.push(card);
  });

  it('offers a free step when you place an ocean tile and have the tag', () => {
    player.tagsForTest = {building: 1};

    const space = addOcean(player);
    card.onTilePlaced(player, player, space);
    runAllActions(game);

    const orOptions = cast(player.popWaitingFor(), OrOptions);
    orOptions.options[0].cb(undefined);

    expect(player.deltaProjectData!.position).eq(1);
    expect(player.energy).eq(0);
  });

  it('does not trigger for another player\'s ocean tile', () => {
    const space = addOcean(player);
    card.onTilePlaced(player, player2, space);
    runAllActions(game);

    expect(player.popWaitingFor()).is.undefined;
  });

  it('offers only the paid option when the tag is missing', () => {
    const space = addOcean(player);
    player.energy = 1;
    card.onTilePlaced(player, player, space);
    runAllActions(game);

    const orOptions = cast(player.popWaitingFor(), OrOptions);
    expect(orOptions.options).has.length(2); // paid + do nothing
    orOptions.options[0].cb(undefined);

    expect(player.deltaProjectData!.position).eq(1);
    expect(player.energy).eq(0);
  });

  it('is a blue (Active) card', () => {
    expect(card.type).eq(CardType.ACTIVE);
  });
});
