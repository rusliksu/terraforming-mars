import {expect} from 'chai';
import {SmeltingPods} from '../../../src/server/cards/sillyfication/SmeltingPods';
import {CoreMines} from '../../../src/server/cards/sillyfication/CoreMines';
import {Comet} from '../../../src/server/cards/base/Comet';
import {OrOptions} from '../../../src/server/inputs/OrOptions';
import {SelectOption} from '../../../src/server/inputs/SelectOption';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('SmeltingPods', () => {
  let card: SmeltingPods;
  let player: TestPlayer;

  beforeEach(() => {
    card = new SmeltingPods();
    [/* game */, player] = testGame(2);
    player.playedCards.push(card);
  });

  it('offers the pay-steel-for-heat-production choice for a building tag, including itself', () => {
    player.steel = 4;
    player.production.override({heat: 0});

    const orOptions = cast(card.onCardPlayed(player, card), OrOptions);
    cast(orOptions.options[0], SelectOption).cb(undefined);

    expect(player.steel).to.eq(0);
    expect(player.production.heat).to.eq(2);
  });

  it('does nothing for a non-building card', () => {
    expect(card.onCardPlayed(player, new Comet())).is.undefined;
  });

  it('does not offer the choice without 4 steel', () => {
    player.steel = 3;
    expect(card.onCardPlayed(player, new CoreMines())).is.undefined;
  });
});
