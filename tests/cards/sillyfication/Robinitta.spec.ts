import {expect} from 'chai';
import {Robinitta} from '../../../src/server/cards/sillyfication/Robinitta';
import {MicroCredits} from '../../../src/server/cards/sillyfication/MicroCredits';
import {Fish} from '../../../src/server/cards/base/Fish';
import {IGame} from '../../../src/server/IGame';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions} from '../../TestingUtils';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('Robinitta', () => {
  let card: Robinitta;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Robinitta();
    [game, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('scores 2 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(2);
  });

  it('a no-tag card raises one of your lowest productions', () => {
    player.production.override({megacredits: 3, steel: 0, titanium: 3, plants: 3, energy: 3, heat: 3});

    card.onCardPlayed(player, new MicroCredits()); // no tags
    runAllActions(game);
    const options = cast(player.popWaitingFor(), OrOptions);
    options.options[0].cb(); // steel is the sole lowest

    expect(player.production.steel).to.eq(1);
  });

  it('a tagged card does nothing', () => {
    player.production.override({steel: 0});
    card.onCardPlayed(player, new Fish()); // animal tag
    runAllActions(game);
    expect(player.popWaitingFor()).is.undefined;
  });
});
