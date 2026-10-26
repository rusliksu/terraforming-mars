import {expect} from 'chai';
import {MartianArmedForces} from '../../../src/server/cards/robantilles/MartianArmedForces';
import {Resource} from '../../../src/common/Resource';
import {TestPlayer} from '../../TestPlayer';

describe('MartianArmedForces', () => {
  let card: MartianArmedForces;
  let player: TestPlayer;

  beforeEach(() => {
    card = new MartianArmedForces();
    player = TestPlayer.BLUE.newPlayer();
  });

  it('does not protect resources before being played', () => {
    expect(player.isProtected(Resource.MEGACREDITS)).is.false;
    expect(player.isProtected(Resource.STEEL)).is.false;
    expect(player.isProtected(Resource.TITANIUM)).is.false;
  });

  it('protects M€, steel and titanium once played', () => {
    player.playedCards.push(card);

    expect(player.isProtected(Resource.MEGACREDITS)).is.true;
    expect(player.isProtected(Resource.STEEL)).is.true;
    expect(player.isProtected(Resource.TITANIUM)).is.true;
    // Unrelated resources stay unprotected.
    expect(player.isProtected(Resource.PLANTS)).is.false;
  });

  it('is worth 2 victory points', () => {
    expect(card.getVictoryPoints(player)).to.eq(2);
  });
});
