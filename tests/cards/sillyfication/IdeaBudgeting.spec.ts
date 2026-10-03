import {expect} from 'chai';
import {IdeaBudgeting} from '../../../src/server/cards/sillyfication/IdeaBudgeting';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {TestPlayer} from '../../TestPlayer';
import {testGame} from '../../TestGame';
import {cast} from '../../../src/common/utils/utils';

describe('IdeaBudgeting', () => {
  let card: IdeaBudgeting;
  let player: TestPlayer;

  beforeEach(() => {
    card = new IdeaBudgeting();
    [/* game */, player] = testGame(2);
  });

  it('gains 5 M€ production', () => {
    player.production.override({megacredits: 0});
    card.play(player);
    expect(player.production.megacredits).to.eq(5);
  });

  it('sets the next-research-phase cap to 1 card', () => {
    card.bespokePlay(player);
    expect(player.nextResearchKeepMax).to.eq(1);
  });

  it('limits the very next research phase to keeping 1 card, then clears itself', () => {
    player.nextResearchKeepMax = 1;
    player.megaCredits = 100;

    player.runResearchPhase();

    const selectCard = cast(player.popWaitingFor(), SelectCard);
    expect(selectCard.config.max).to.eq(1);
    expect(player.nextResearchKeepMax).is.undefined;
  });
});
