import {expect} from 'chai';
import {SeabedExtraction} from '../../../src/server/cards/corporatebetterments/SeabedExtraction';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {addOcean} from '../../TestingUtils';

describe('SeabedExtraction', () => {
  let card: SeabedExtraction;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SeabedExtraction();
    [/* game */, player] = testGame(2);
  });

  it('gains 1 steel for each ocean in play', () => {
    addOcean(player);
    addOcean(player);
    addOcean(player);

    // Placing tiles on bonus spaces can itself grant steel; only the card's own gain matters here.
    const before = player.steel;
    card.play(player);

    expect(player.steel - before).to.eq(3);
  });

  it('gains nothing when there are no oceans', () => {
    card.play(player);
    expect(player.steel).to.eq(0);
  });
});
