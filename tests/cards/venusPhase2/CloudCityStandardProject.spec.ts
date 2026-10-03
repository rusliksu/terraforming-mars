import {expect} from 'chai';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {testGame, runAllActions} from '../../TestingUtils';
import {CloudCityStandardProject} from '../../../src/server/cards/venusPhase2/CloudCityStandardProject';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {Dirigibles} from '../../../src/server/cards/venusNext/Dirigibles';
import {AerialMappers} from '../../../src/server/cards/venusNext/AerialMappers';
import {TileType} from '../../../src/common/TileType';
import {SelectSpace} from '../../../src/server/inputs/SelectSpace';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {Payment} from '../../../src/common/inputs/Payment';
import {cast} from '@/common/utils/utils';

describe('CloudCityStandardProject', () => {
  let game: IGame;
  let player: TestPlayer;
  let card: CloudCityStandardProject;

  beforeEach(() => {
    [game, player] = testGame(2, {venusPhase2Expansion: true});
    card = new CloudCityStandardProject();
  });

  it('is offered in the grouped Standard Projects list', () => {
    const names = game.getStandardProjects().map((c) => c.name);
    expect(names).to.include(card.name);
  });

  it('canAct once affordable', () => {
    player.megaCredits = card.cost - 1;
    expect(card.canAct(player)).is.false;
    player.megaCredits = card.cost;
    expect(card.canAct(player)).is.true;
  });

  it('canAct accounts for a floater discount even when short on M€', () => {
    const dirigibles = new Dirigibles();
    dirigibles.resourceCount = 3; // Worth 9 M€ off.
    player.playedCards.push(dirigibles);

    player.megaCredits = card.cost - 9 - 1;
    expect(card.canAct(player)).is.false;
    player.megaCredits = card.cost - 9;
    expect(card.canAct(player)).is.true;
  });

  it('cannot act when there is no available land space, even with plenty of M€', () => {
    player.megaCredits = 999;
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    for (const space of venusSurface.getAvailableSpacesForLand(player)) {
      VenusPhase2Expansion.addFloaterArrayTile(player, space.id);
    }
    expect(card.canAct(player)).is.false;
  });

  it('places a tile and grants +1 M€ production, paying the full cost with no floaters', () => {
    player.megaCredits = card.cost;
    card.payAndExecute(player, Payment.of({megacredits: card.cost}));
    runAllActions(game);

    const space = cast(player.popWaitingFor(), SelectSpace);
    const target = space.spaces[0];
    space.cb(target);
    runAllActions(game);

    expect(player.megaCredits).to.eq(0);
    expect(player.production.megacredits).to.eq(1);
    expect(game.getVenusScaleLevel()).to.eq(2); // 1 raise-step, at the official 2%-per-step rate.
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(game).venusSurface;
    expect(venusSurface.getSpaceOrThrow(target.id).tile?.tileType).to.eq(TileType.VENUS_CLOUD_CITY);
  });

  it('discounts 3 M€ per floater spent, pulling from a single card with enough floaters', () => {
    const dirigibles = new Dirigibles();
    dirigibles.resourceCount = 3;
    player.playedCards.push(dirigibles);
    player.megaCredits = card.cost - 9; // Full price minus a 3-floater discount.

    card.payAndExecute(player, Payment.of({megacredits: card.cost - 9, anyFloaters: 3}));
    runAllActions(game);

    // A single qualifying card auto-deducts -- no SelectCard prompt.
    expect(dirigibles.resourceCount).to.eq(0);
    expect(player.megaCredits).to.eq(0);

    // Still finishes the project -- confirm the placement prompt is now up.
    const space = cast(player.popWaitingFor(), SelectSpace);
    expect(space).to.exist;
  });

  it('prompts to pick a card when floaters are spread across more than one', () => {
    const dirigibles = new Dirigibles();
    dirigibles.resourceCount = 1;
    const mappers = new AerialMappers();
    mappers.resourceCount = 1;
    player.playedCards.push(dirigibles, mappers);
    player.megaCredits = card.cost - 3;

    card.payAndExecute(player, Payment.of({megacredits: card.cost - 3, anyFloaters: 1}));
    runAllActions(game);

    const pick = cast(player.popWaitingFor(), SelectCard);
    pick.cb([dirigibles]);
    runAllActions(game);

    expect(dirigibles.resourceCount).to.eq(0);
    expect(mappers.resourceCount).to.eq(1);
  });

  it('canPayWith advertises anyFloaters', () => {
    expect(card.canPayWith()).to.deep.eq({anyFloaters: true});
  });
});
