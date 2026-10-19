import {expect} from 'chai';
import {MarsHomesteadAct} from '../../../src/server/cards/sillyfication/MarsHomesteadAct';
import {Tag} from '../../../src/common/cards/Tag';
import {TileType} from '../../../src/common/TileType';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectOption} from '../../../src/server/inputs/SelectOption';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';
import {runAllActions} from '../../TestingUtils';

describe('MarsHomesteadAct', () => {
  let card: MarsHomesteadAct;
  let player: TestPlayer;
  let player2: TestPlayer;

  beforeEach(() => {
    card = new MarsHomesteadAct();
    [/* game */, player, player2] = testGame(2, {preludeExtension: true});
  });

  it('has city, building, and mars tags', () => {
    expect(card.tags).to.deep.eq([Tag.CITY, Tag.BUILDING, Tag.MARS]);
  });

  it('pays the tile owner 2 M€ and the card owner 1 M€ production on any city placement', () => {
    player.playedCards.push(card);
    player.megaCredits = 0;
    player.production.override({megacredits: 0});
    player2.megaCredits = 0;

    const game = player.game;
    const space = game.board.getAvailableSpacesForCity(player2)[0];
    game.addCity(player2, space);

    expect(player2.megaCredits).to.eq(2);
    expect(player.production.megacredits).to.eq(1);
  });

  it('offers each player, starting with you, the chance to place a city on Mars', () => {
    const game = player.game;
    card.play(player);
    runAllActions(game);

    const first = cast(player.popWaitingFor(), OrOptions);
    cast(first.options[0], SelectOption).cb(undefined);
    runAllActions(game);
    const space = cast(player.popWaitingFor(), SelectSpace);
    space.cb(space.spaces[0]);
    runAllActions(game);

    expect(space.spaces).is.not.empty;
    expect(game.board.spaces.some((s) => s.tile?.tileType === TileType.CITY && s.player?.id === player.id)).is.true;

    const second = cast(player2.popWaitingFor(), OrOptions);
    cast(second.options[1], SelectOption).cb(undefined);
    runAllActions(game);

    expect(player.popWaitingFor()).is.undefined;
    expect(player2.popWaitingFor()).is.undefined;
  });
});
