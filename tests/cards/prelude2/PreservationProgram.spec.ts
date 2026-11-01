import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {forceGenerationEnd, testRedsCosts} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {PreservationProgram} from '../../../src/server/cards/prelude2/PreservationProgram';
import {Phase} from '../../../src/common/Phase';
import {BigAsteroid} from '../../../src/server/cards/base/BigAsteroid';

describe('PreservationProgram', () => {
  let card: PreservationProgram;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new PreservationProgram();
    [game, player] = testGame(2, {turmoilExtension: true});
  });

  it('play', () => {
    card.play(player);
    expect(player.terraformRating).eq(25);
  });

  it('Blocks first TR of each generation', () => {
    card.play(player);
    player.playedCards.push(card);

    game.phase = Phase.ACTION;

    expect(player.terraformRating).eq(25);

    player.increaseTerraformRating();
    expect(player.terraformRating).eq(25);

    player.increaseTerraformRating();
    expect(player.terraformRating).eq(26);

    player.increaseTerraformRating();
    expect(player.terraformRating).eq(27);

    forceGenerationEnd(game);

    player.increaseTerraformRating();
    expect(player.terraformRating).eq(27);

    player.increaseTerraformRating();
    expect(player.terraformRating).eq(28);
  });

  it('Allows multi TR to go partially through', () => {
    card.play(player);
    player.playedCards.push(card);

    game.phase = Phase.ACTION;

    expect(player.terraformRating).eq(25);

    player.increaseTerraformRating(3);
    expect(player.terraformRating).eq(27);
  });

  it('Compatible with Reds', () => {
    // Big asteroid raises the temperature 2 steps.
    const bigAsteroid = new BigAsteroid();
    testRedsCosts(() => player.canPlay(bigAsteroid), player, bigAsteroid.cost, 6);

    const cb = () => {
      player.preservationProgram = true;
      return player.canPlay(bigAsteroid);
    };
    testRedsCosts(cb, player, bigAsteroid.cost, 3);
  });

  it('only grants 4 TR when played during action phase', () => {
    game.phase = Phase.ACTION;
    card.play(player);
    expect(player.terraformRating).eq(24);
    expect(player.preservationProgram).is.false;
  });

  it('grants the full 5 TR when an earlier TR was gained this generation', () => {
    game.phase = Phase.ACTION;

    player.increaseTerraformRating();
    expect(player.terraformRating).eq(21);

    card.play(player);

    expect(player.terraformRating).eq(26);
    expect(player.preservationProgram).is.false;
  });

  it('grants the full 5 TR when played outside the action phase', () => {
    // The effect only applies to each generation's action phase, so the TR
    // from the card itself is not skipped during the prelude phase.
    card.play(player);

    expect(player.terraformRating).eq(25);
    expect(player.preservationProgram).is.true;
  });

  it('Reds pay for the TR when this card is played', () => {
    testRedsCosts(() => player.canPlay(card), player, 0, 15);
  });
});
