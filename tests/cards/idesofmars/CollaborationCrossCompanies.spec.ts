import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {CollaborationCrossCompanies} from '../../../src/server/cards/idesofmars/CollaborationCrossCompanies';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectPlayer} from '../../../src/server/inputs/SelectPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('CollaborationCrossCompanies', () => {
  let card: CollaborationCrossCompanies;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new CollaborationCrossCompanies();
    [game, player, player2] = testGame(2);
    player.playedCards.push(card);
  });

  it('requires a TR of at least 25', () => {
    player.setTerraformRating(24);
    expect(card.canPlay(player)).is.false;
    player.setTerraformRating(25);
    expect(card.canPlay(player)).is.true;
  });

  it('cannot act without enough of any giveable resource', () => {
    player.megaCredits = 5;
    player.plants = 2;
    player.heat = 5;
    expect(card.canAct(player)).is.false;
  });

  it('can act with enough of at least one giveable resource', () => {
    player.megaCredits = 6;
    expect(card.canAct(player)).is.true;
  });

  it('gives the chosen resource to the chosen opponent', () => {
    player.megaCredits = 6;

    const orOptions = cast(card.action(player), OrOptions);
    const selectPlayer = cast(orOptions.options[0].cb(), SelectPlayer);
    selectPlayer.cb(player2);

    expect(player.megaCredits).to.eq(0);
    expect(player2.megaCredits).to.eq(6);
  });

  it('raises the giver\'s TR 1 step if the recipient raises TR later that generation', () => {
    player.setTerraformRating(25);
    player.megaCredits = 6;

    const orOptions = cast(card.action(player), OrOptions);
    const selectPlayer = cast(orOptions.options[0].cb(), SelectPlayer);
    selectPlayer.cb(player2);

    const trBefore = player.terraformRating;
    player2.increaseTerraformRating();

    expect(player.terraformRating).to.eq(trBefore + 1);
  });

  it('does not raise TR when the giver themselves raises TR, only the recipient counts', () => {
    player.setTerraformRating(25);
    player.megaCredits = 6;

    const orOptions = cast(card.action(player), OrOptions);
    const selectPlayer = cast(orOptions.options[0].cb(), SelectPlayer);
    selectPlayer.cb(player2);

    const trBefore = player.terraformRating;
    player.increaseTerraformRating(); // the giver raises their own TR, not the recipient's

    // Only their own +1 shows up; no extra bonus from the still-pending gift.
    expect(player.terraformRating).to.eq(trBefore + 1);
  });

  it('does not raise TR for a gift given in an earlier generation', () => {
    player.setTerraformRating(25);
    player.megaCredits = 6;

    const orOptions = cast(card.action(player), OrOptions);
    const selectPlayer = cast(orOptions.options[0].cb(), SelectPlayer);
    selectPlayer.cb(player2);

    game.generation += 1;
    const trBefore = player.terraformRating;
    player2.increaseTerraformRating();

    expect(player.terraformRating).to.eq(trBefore);
  });
});
