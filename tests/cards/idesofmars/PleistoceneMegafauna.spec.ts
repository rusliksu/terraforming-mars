import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {PleistoceneMegafauna} from '../../../src/server/cards/idesofmars/PleistoceneMegafauna';
import {SelectPlayer} from '../../../src/server/inputs/SelectPlayer';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';
import {Resource} from '../../../src/common/Resource';

describe('PleistoceneMegafauna', () => {
  let card: PleistoceneMegafauna;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new PleistoceneMegafauna();
    [game, player, player2] = testGame(2);
  });

  it('cannot play with fewer than 5 science tags', () => {
    player.tagsForTest = {science: 4};
    player.production.add(Resource.PLANTS, 1);
    expect(card.canPlay(player)).is.false;
  });

  it('cannot play without at least 1 plant production of your own to give up', () => {
    player.tagsForTest = {science: 5};
    expect(card.canPlay(player)).is.false;
  });

  it('can play with 5 science tags and at least 1 plant production', () => {
    player.tagsForTest = {science: 5};
    player.production.add(Resource.PLANTS, 1);
    expect(card.canPlay(player)).is.true;
  });

  it('decreases own plant production and the sole opponent\'s', () => {
    player.tagsForTest = {science: 5};
    player.production.add(Resource.PLANTS, 2);
    player2.production.add(Resource.PLANTS, 2);

    card.play(player);
    runAllActions(game);

    expect(player.production.plants).to.eq(1);
    expect(player2.production.plants).to.eq(1);
  });

  it('lets the player pick which opponent loses 1 plant production, in a 3-player game', () => {
    const [threePlayerGame, threePlayer, opponent1, opponent2] = testGame(3);
    opponent1.production.add(Resource.PLANTS, 2);
    opponent2.production.add(Resource.PLANTS, 2);
    threePlayer.tagsForTest = {science: 5};
    threePlayer.production.add(Resource.PLANTS, 1);

    const result = card.play(threePlayer);
    const selectPlayer = cast(result, SelectPlayer);
    selectPlayer.cb(opponent2);
    runAllActions(threePlayerGame);

    expect(opponent1.production.plants).to.eq(2);
    expect(opponent2.production.plants).to.eq(1);
  });

  it('can act to add an animal to this card', () => {
    expect(card.canAct(player)).is.true;
    card.action(player);
    runAllActions(game);
    expect(card.resourceCount).to.eq(1);
  });

  it('awards 1 VP per animal on this card', () => {
    player.addResourceTo(card, 3);
    expect(card.getVictoryPoints(player)).to.eq(3);
  });
});
