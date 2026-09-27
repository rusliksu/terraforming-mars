import {expect} from 'chai';
import {testGame} from '../../TestGame';
import {CorporateAcquisition} from '../../../src/server/cards/idesofmars/CorporateAcquisition';
import {TestPlayer} from '../../TestPlayer';
import {SelectResource} from '../../../src/server/inputs/SelectResource';
import {cast} from '../../../src/common/utils/utils';

describe('CorporateAcquisition', () => {
  let card: CorporateAcquisition;
  let player: TestPlayer;

  beforeEach(() => {
    card = new CorporateAcquisition();
    [/* game */, player] = testGame(1);
  });

  it('increases a production of the player\'s choice by 1 step', () => {
    const startingSteel = player.production.steel;

    const selectResource = cast(card.play(player), SelectResource);
    selectResource.cb('steel');

    expect(player.production.steel).to.eq(startingSteel + 1);
  });
});
