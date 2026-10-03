import {expect} from 'chai';
import {Research} from '../../../src/server/cards/base/Research';
import {AerialMappers} from '../../../src/server/cards/venusNext/AerialMappers';
import {Stratopolis} from '../../../src/server/cards/venusNext/Stratopolis';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {churn, runAllActions, testGame} from '../../TestingUtils';
import {TestPlayer} from '../../TestPlayer';
import {cast} from '@/common/utils/utils';
import {SpaceName} from '../../../src/common/boards/SpaceName';
import {VenusPhase2Expansion} from '../../../src/server/venusPhase2/VenusPhase2Expansion';
import {VENUS_STRATOPOLIS} from '../../../src/server/venusPhase2/VenusSurfaceBoard';

describe('Stratopolis', () => {
  let card: Stratopolis;
  let player: TestPlayer;

  beforeEach(() => {
    card = new Stratopolis();
    [/* game */, player/* , player2 */] = testGame(2, {venusNextExtension: true});
  });

  it('Can not play', () => {
    expect(card.canPlay(player)).is.not.true;
  });

  it('Should play', () => {
    player.playedCards.push(new Research());
    expect(card.canPlay(player)).is.true;

    card.play(player);
    expect(player.production.megacredits).to.eq(2);
  });

  it('Should act - single target', () => {
    player.playedCards.push(card);
    card.action(player);
    runAllActions(player.game);
    expect(card.resourceCount).to.eq(2);
  });

  it('Should act - multiple targets', () => {
    const card2 = new AerialMappers();
    player.playedCards.push(card, card2);

    const selectCard = cast(churn(card.action(player), player), SelectCard);
    selectCard.cb([card2]);

    expect(card2.resourceCount).to.eq(2);
  });

  it('places its city tile on Mars when Venus Phase 2 is off (backward compat)', () => {
    player.playedCards.push(new Research());
    card.play(player);
    expect(player.game.board.getSpaceOrThrow(SpaceName.STRATOPOLIS).tile?.card).to.eq(card.name);
  });

  it('places its city tile on the Venus surface board when Venus Phase 2 is on', () => {
    const [venusPhase2Game, venusPhase2Player] = testGame(2, {venusNextExtension: true, venusPhase2Expansion: true});
    const venusPhase2Card = new Stratopolis();
    venusPhase2Player.playedCards.push(new Research());
    expect(venusPhase2Card.canPlay(venusPhase2Player)).is.true;

    venusPhase2Card.play(venusPhase2Player);
    const venusSurface = VenusPhase2Expansion.venusPhase2Data(venusPhase2Game).venusSurface;
    expect(venusSurface.getSpaceOrThrow(VENUS_STRATOPOLIS).tile?.card).to.eq(venusPhase2Card.name);
    // The reserved spot doesn't exist on Mars at all once Venus Phase 2 is on (not just
    // "unoccupied") -- BoardBuilder.addExpansionColonySpaces skips it entirely for this board.
    expect(() => venusPhase2Game.board.getSpaceOrThrow(SpaceName.STRATOPOLIS)).to.throw();
  });

  it('cannot play again once its reserved Venus surface spot is occupied', () => {
    const [, venusPhase2Player] = testGame(2, {venusNextExtension: true, venusPhase2Expansion: true});
    const first = new Stratopolis();
    const second = new Stratopolis();
    venusPhase2Player.playedCards.push(new Research());
    first.play(venusPhase2Player);
    expect(second.canPlay(venusPhase2Player)).is.not.true;
  });
});
