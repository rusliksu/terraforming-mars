import {expect} from 'chai';
import {CloudCityRA} from '../../../src/server/cards/robantilles/CloudCityRA';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {Stratopolis} from '../../../src/server/cards/venusNext/Stratopolis';
import {SpaceName} from '../../../src/common/boards/SpaceName';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {setVenusScaleLevel} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {IProjectCard} from '../../../src/server/cards/IProjectCard';

describe('CloudCityRA', () => {
  let card: CloudCityRA;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new CloudCityRA();
    [game, player] = testGame(2, {venusNextExtension: true, robAntillesExpansion: true});
    player.playedCards.push(card);
  });

  it('cannot play with Venus below 12%', () => {
    setVenusScaleLevel(game, 10);
    expect(card.canPlay(player)).is.false;
  });

  it('can play with Venus at 12% or above, placing a city on the reserved Venus space', () => {
    setVenusScaleLevel(game, 12);
    expect(card.canPlay(player)).is.true;

    cast(card.play(player), undefined);
    const space = game.board.getSpaceOrThrow(SpaceName.CLOUD_CITY_RA);
    expect(space.tile?.tileType).is.not.undefined;
    expect(space.player).to.eq(player);
  });

  it('adds up to 2 floaters, one at a time, letting each go to a different card', () => {
    const dirigibles = new Dirigibles();
    const stratopolis = new Stratopolis();
    player.playedCards.push(dirigibles, stratopolis);

    card.action(player);

    const select1 = cast(game.deferredActions.pop()?.execute(), SelectCard<IProjectCard>);
    select1.cb([dirigibles]);
    const select2 = cast(game.deferredActions.pop()?.execute(), SelectCard<IProjectCard>);
    select2.cb([stratopolis]);

    expect(dirigibles.resourceCount).to.eq(1);
    expect(stratopolis.resourceCount).to.eq(1);
  });

  it('awards 1 VP for each card owned with at least 1 floater on it', () => {
    const dirigibles = new Dirigibles();
    player.playedCards.push(dirigibles);
    expect(card.getVictoryPoints(player)).to.eq(0);

    player.addResourceTo(dirigibles, 1);
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
