import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {Photoreflectors} from '../../../src/server/cards/corporatebetterments/Photoreflectors';
import {TestPlayer} from '../../TestPlayer';

describe('Photoreflectors', () => {
  let card: Photoreflectors;
  let player: TestPlayer;

  beforeEach(() => {
    card = new Photoreflectors();
    [/* game */, player] = testGame(2);
  });

  it('cannot act without 4 energy', () => {
    player.energy = 3;
    expect(card.canAct(player)).is.false;
  });

  it('spends 4 energy to raise TR 1 step', () => {
    player.energy = 4;
    const startingTr = player.terraformRating;
    expect(card.canAct(player)).is.true;

    card.action(player);

    expect(player.energy).to.eq(0);
    expect(player.terraformRating).to.eq(startingTr + 1);
  });

  it('awards 1 flat VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(1);
  });
});
