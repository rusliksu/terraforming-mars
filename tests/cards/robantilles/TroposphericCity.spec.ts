import {expect} from 'chai';
import {TroposphericCity} from '../../../src/server/cards/robantilles/TroposphericCity';
import {SpaceName} from '../../../src/common/boards/SpaceName';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('TroposphericCity', () => {
  let card: TroposphericCity;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new TroposphericCity();
    [game, player] = testGame(2, {venusNextExtension: true, robAntillesExpansion: true});
  });

  it('places a city on the reserved Venus space when played', () => {
    cast(card.play(player), undefined);
    const space = game.board.getSpaceOrThrow(SpaceName.TROPOSPHERIC_CITY);
    expect(space.tile?.tileType).is.not.undefined;
    expect(space.player).to.eq(player);
  });

  it('awards 1 VP for every 2 Venus tags owned', () => {
    player.playedCards.push(card);
    player.tagsForTest = {venus: 5};
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
