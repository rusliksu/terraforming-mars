import {expect} from 'chai';
import {SpaceOffice} from '../../../src/server/cards/sillyfication/SpaceOffice';
import {Comet} from '../../../src/server/cards/base/Comet';
import {Sponsors} from '../../../src/server/cards/base/Sponsors';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectOption} from '../../../src/server/inputs/SelectOption';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {cast} from '../../../src/common/utils/utils';

describe('SpaceOffice', () => {
  let card: SpaceOffice;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SpaceOffice();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('scores 3 VP', () => {
    expect(card.getVictoryPoints(player)).to.eq(3);
  });

  it('adds a fighter resource for the first two space tags played', () => {
    player.onCardPlayed(new Comet());
    runAllActions(player.game);
    expect(card.resourceCount).to.eq(1);

    player.onCardPlayed(new Comet());
    runAllActions(player.game);
    expect(card.resourceCount).to.eq(2);
  });

  it('does not react to a card without a space tag', () => {
    player.onCardPlayed(new Sponsors());
    runAllActions(player.game);
    expect(card.resourceCount).to.eq(0);
  });

  it('offers remove-2-to-draw-2 once you have 2 fighter resources', () => {
    player.addResourceTo(card, 2);
    player.cardsInHand = [];

    card.onCardPlayed(player, new Comet());
    runAllActions(player.game);

    const orOptions = cast(player.popWaitingFor(), OrOptions);
    cast(orOptions.options[0], SelectOption).cb(undefined);

    expect(card.resourceCount).to.eq(0);
    expect(player.cardsInHand).has.lengthOf(2);
  });
});
