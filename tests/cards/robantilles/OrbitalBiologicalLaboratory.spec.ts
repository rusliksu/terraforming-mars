import {expect} from 'chai';
import {OrbitalBiologicalLaboratory} from '../../../src/server/cards/robantilles/OrbitalBiologicalLaboratory';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('OrbitalBiologicalLaboratory', () => {
  let card: OrbitalBiologicalLaboratory;
  let player: TestPlayer;

  beforeEach(() => {
    card = new OrbitalBiologicalLaboratory();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('with no microbes on the card, automatically adds 2 microbes (only valid option)', () => {
    card.action(player);
    runAllActions(player.game);
    expect(card.resourceCount).to.eq(2);
  });

  it('with microbes on the card, offers a choice; removing 1 microbe gains 3 M€', () => {
    card.resourceCount = 1;
    const before = player.megaCredits;

    card.action(player);
    runAllActions(player.game);

    const orOptions = cast(player.popWaitingFor(), OrOptions);
    expect(orOptions.options.length).to.eq(2);
    // Second declared behavior: "Remove 1 microbe from this card to gain 3 M€".
    orOptions.options[1].cb(undefined);

    expect(player.megaCredits - before).to.eq(3);
    expect(card.resourceCount).to.eq(0);
  });
});
