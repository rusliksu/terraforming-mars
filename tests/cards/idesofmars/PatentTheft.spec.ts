import {expect} from 'chai';
import {PatentTheft} from '../../../src/server/cards/idesofmars/PatentTheft';
import {Steelworks} from '../../../src/server/cards/base/Steelworks';
import {SpaceMirrors} from '../../../src/server/cards/base/SpaceMirrors';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {cast} from '../../../src/common/utils/utils';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectOption} from '../../../src/server/inputs/SelectOption';
import {runAllActions} from '../../TestingUtils';

describe('PatentTheft', () => {
  let card: PatentTheft;
  let player: TestPlayer;
  let opponent: TestPlayer;
  let game: IGame;
  let steelworks: Steelworks;

  beforeEach(() => {
    card = new PatentTheft();
    [game, player, opponent] = testGame(2);
    steelworks = new Steelworks();
    opponent.playedCards.push(steelworks);
  });

  it('cannot act without a usable active card among opponents', () => {
    player.energy = 0;
    expect(card.canAct(player)).is.false;
  });

  it('uses an opponent\'s active card, spending and granting to the acting player, and gains a Loot', () => {
    player.energy = 4;
    expect(card.canAct(player)).is.true;

    // A single sharable card collapses straight to that card's own action (undefined here,
    // since Steelworks resolves immediately with no further input).
    const result = card.action(player);
    runAllActions(game);
    expect(result).is.undefined;

    expect(player.energy).to.eq(0);
    expect(player.steel).to.eq(2);
    expect(opponent.steel).to.eq(0);
    expect(card.resourceCount).to.eq(1);
  });

  it('offers a choice when more than one opponent card is sharable', () => {
    player.energy = 4;
    player.megaCredits = 7;
    const spaceMirrors = new SpaceMirrors();
    opponent.playedCards.push(spaceMirrors);

    const result = cast(card.action(player), OrOptions);
    expect(result.options).to.have.length(2);

    // Use Space Mirrors, the second offered option.
    cast(result.options[1], SelectOption).cb(undefined);
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(player.production.energy).to.eq(1);
    expect(card.resourceCount).to.eq(1);
    // The unused Steelworks option was not consumed.
    expect(player.energy).to.eq(4);
  });

  it('scores -1 VP for every 2 Loot resources on this card', () => {
    expect(card.getVictoryPoints(player)).to.eq(0);
    player.addResourceTo(card, 2);
    expect(card.getVictoryPoints(player)).to.eq(-1);
    player.addResourceTo(card, 2);
    expect(card.getVictoryPoints(player)).to.eq(-2);
  });
});
