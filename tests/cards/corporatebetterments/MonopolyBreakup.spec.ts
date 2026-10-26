import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {MonopolyBreakup} from '../../../src/server/cards/corporatebetterments/MonopolyBreakup';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '../../../src/common/utils/utils';

describe('MonopolyBreakup', () => {
  let card: MonopolyBreakup;
  let player: TestPlayer;
  let player2: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new MonopolyBreakup();
    [game, player, player2] = testGame(2);
  });

  it('cannot play unless an opponent leads by 10 TR', () => {
    player.setTerraformRating(35);
    expect(card.canPlay(player)).is.false;

    player2.setTerraformRating(player.terraformRating + 9);
    expect(card.canPlay(player)).is.false;

    player2.setTerraformRating(player.terraformRating + 10);
    expect(card.canPlay(player)).is.true;
  });

  it('cannot play when no milestone is available to claim', () => {
    player2.setTerraformRating(player.terraformRating + 10);
    // Player's TR (starting value) doesn't meet any milestone's threshold.
    expect(card.canPlay(player)).is.false;
  });

  it('claims an unclaimed milestone even after the normal cap is reached', () => {
    player.setTerraformRating(35); // Qualifies for the Terraformer milestone.
    player2.setTerraformRating(player.terraformRating + 10);
    player.megaCredits = 8;

    // Fill up the 3-milestone cap with claims unrelated to Terraformer.
    const others = game.milestones.filter((milestone) => milestone.name !== 'Terraformer').slice(0, 3);
    expect(others).has.lengthOf(3);
    for (const milestone of others) {
      game.claimedMilestones.push({player: player2, milestone});
    }
    expect(game.allMilestonesClaimed()).is.true;
    expect(player.claimableMilestones()).is.empty;

    expect(card.canPlay(player)).is.true;

    const orOptions = cast(card.play(player), OrOptions);
    const terraformerOption = orOptions.options.find((option) => option.title === 'Terraformer')!;
    terraformerOption.cb(undefined);

    // Resolves the milestone payment.
    game.deferredActions.runNext();

    expect(player.megaCredits).to.eq(0);
    expect(game.claimedMilestones.map((claim) => claim.milestone.name)).to.include('Terraformer');
  });
});
