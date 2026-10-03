import {expect} from 'chai';
import {PlotContamination} from '../../../src/server/cards/idesofmars/PlotContamination';
import {testGame} from '../../TestGame';
import {TestPlayer} from '../../TestPlayer';

describe('PlotContamination', () => {
  let card: PlotContamination;
  let player: TestPlayer;
  let opponent: TestPlayer;

  beforeEach(() => {
    card = new PlotContamination();
    [/* game */, player, opponent] = testGame(2);
  });

  it('does nothing when no opponent has higher Plant production', () => {
    player.production.override({plants: 2});
    opponent.production.override({plants: 2});

    card.bespokePlay(player);

    expect(player.production.plants).to.eq(2);
  });

  it('increases Plant production 1 step when an opponent has higher Plant production', () => {
    player.production.override({plants: 0});
    opponent.production.override({plants: 1});

    card.bespokePlay(player);

    expect(player.production.plants).to.eq(1);
  });
});
