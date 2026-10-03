import {expect} from 'chai';
import {BioWasteReactor} from '../../../src/server/cards/venusPhase2/BioWasteReactor';
import {Ants} from '../../../src/server/cards/base/Ants';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {cast} from '../../../src/common/utils/utils';

describe('BioWasteReactor', () => {
  let card: BioWasteReactor;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new BioWasteReactor();
    [game, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('cannot act without 4 plants', () => {
    player.plants = 3;
    expect(card.canAct(player)).is.false;
    player.plants = 4;
    expect(card.canAct(player)).is.true;
  });

  it('spends 4 plants to add 2 microbes to a card', () => {
    const ants = new Ants();
    player.playedCards.push(ants);
    player.plants = 4;

    card.action(player);
    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    options.options[0].cb();
    runAllActions(game);

    expect(player.plants).to.eq(0);
    expect(ants.resourceCount).to.eq(2);
  });
});
