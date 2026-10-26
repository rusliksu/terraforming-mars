import {expect} from 'chai';
import {StemCellResearchCenter} from '../../../src/server/cards/robantilles/StemCellResearchCenter';
import {Ants} from '../../../src/server/cards/base/Ants';
import {TestPlayer} from '../../TestPlayer';
import {IGame} from '../../../src/server/IGame';
import {testGame} from '../../TestGame';
import {addCity, runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('StemCellResearchCenter', () => {
  let card: StemCellResearchCenter;
  let player: TestPlayer;
  let opponent: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new StemCellResearchCenter();
    [game, player, opponent] = testGame(2);
    player.playedCards.push(card);
  });

  it('increases M€ production when played', () => {
    cast(card.play(player), undefined);
    expect(player.production.megacredits).to.eq(1);
  });

  it('adds a microbe to an eligible card whenever a city tile is placed', () => {
    const ants = new Ants();
    player.playedCards.push(ants);

    addCity(player);
    runAllActions(game);
    expect(ants.resourceCount).to.eq(1);

    addCity(opponent);
    runAllActions(game);
    expect(ants.resourceCount).to.eq(2);
  });
});
