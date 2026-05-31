import {expect} from 'chai';
import {IGame} from '../../../src/server/IGame';
import {TestPlayer} from '../../TestPlayer';
import {runAllActions, forceGenerationEnd, churn, formatMessage} from '../../TestingUtils';
import {testGame} from '../../TestGame';
import {Clarke} from '../../../src/server/cards/ceos/Clarke';

describe('Clarke', () => {
  let card: Clarke;
  let player: TestPlayer;
  let game: IGame;

  beforeEach(() => {
    card = new Clarke();
    [game, player] = testGame(1);
  });

  it('Can only act once per game', () => {
    expect(card.canAct(player)).is.true;

    card.action(player);
    runAllActions(game);
    forceGenerationEnd(game);

    expect(card.isDisabled).is.true;
    expect(card.canAct(player)).is.false;
  });

  it('Takes action', () => {
    game.gameLog.length = 0;
    expect(churn(card.action(player), player)).is.undefined;
    expect(player.production.plants).eq(1);
    expect(player.production.heat).eq(1);
    expect(player.plants).eq(5);
    expect(player.heat).eq(5);
    expect(game.gameLog.map(formatMessage)).includes.members([
      'blue gained 1 plant production',
      'blue gained 1 heat production',
      'blue gained 5 plants',
      'blue gained 5 heat',
    ]);
  });
});
