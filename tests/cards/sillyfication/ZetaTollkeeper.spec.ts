import {expect} from 'chai';
import {ZetaTollkeeper} from '../../../src/server/cards/sillyfication/ZetaTollkeeper';
import {testGame} from '../../TestGame';
import {runAllActions} from '../../TestingUtils';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';

describe('ZetaTollkeeper', () => {
  let card: ZetaTollkeeper;
  let game: IGame;
  let player: TestPlayer;

  beforeEach(() => {
    card = new ZetaTollkeeper();
    [game, player] = testGame(1, {deltaProjectExpansion: true});
    player.playCorporationCard(card);
    runAllActions(game);
  });

  it('has no tags', () => {
    expect(card.tags).to.deep.eq([]);
  });

  it('starts with 14 M€ and 6 M€ production', () => {
    expect(player.megaCredits).eq(14);
    expect(player.production.megacredits).eq(6);
  });

  it('cannot act at position 0', () => {
    expect(card.canAct(player)).is.false;
  });

  it('cannot act on a VP spot', () => {
    player.deltaProjectData!.position = 10; // 2VP
    expect(card.canAct(player)).is.false;
  });

  it('action re-grants the current position bonus without moving', () => {
    player.deltaProjectData!.position = 3; // Earth: +2 M€ production
    player.production.override({megacredits: 0});

    expect(card.canAct(player)).is.true;
    card.action(player);

    expect(player.deltaProjectData!.position).eq(3);
    expect(player.production.megacredits).eq(2);
  });
});
