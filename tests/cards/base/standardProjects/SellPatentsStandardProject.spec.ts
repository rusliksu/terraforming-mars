import {expect} from 'chai';
import {CardName} from '../../../../src/common/cards/CardName';
import {LogMessageDataType} from '../../../../src/common/logs/LogMessageDataType';
import {cast} from '../../../../src/common/utils/utils';
import {SellPatentsStandardProject} from '../../../../src/server/cards/base/standardProjects/SellPatentsStandardProject';
import {IProjectCard} from '../../../../src/server/cards/IProjectCard';
import {newProjectCard} from '../../../../src/server/createCard';
import {SelectCard} from '../../../../src/server/inputs/SelectCard';
import {GameLogs} from '../../../../src/server/routes/GameLogs';
import {testGame} from '../../../TestGame';

describe('SellPatentsStandardProject', () => {
  it('logs sold cards by name for the player and spectator', () => {
    const card = new SellPatentsStandardProject();
    const [game, player, otherPlayer] = testGame(2);
    const soldCards = [
      newProjectCard(CardName.ALGAE)!,
      newProjectCard(CardName.ANTS)!,
    ];
    game.gameLog = [];
    player.cardsInHand = [...soldCards];
    player.megaCredits = 0;

    const selectCard = cast(card.action(player), SelectCard<IProjectCard>);
    selectCard.cb(soldCards);

    expect(player.cardsInHand).is.empty;
    expect(player.megaCredits).eq(2);

    const publicMessages = game.gameLog.filter((entry) => entry.playerId === undefined);
    expect(publicMessages.map((entry) => entry.message)).does.not.include('${0} used ${1} standard project');
    const publicCountMessage = publicMessages.find((entry) => entry.message === '${0} sold ${1} patents');
    expect(publicCountMessage).is.not.undefined;
    expect(publicCountMessage!.hiddenFor).deep.eq([player.id, game.spectatorId]);

    const privateMessages = game.gameLog.filter((entry) => entry.playerId === player.id);
    expect(privateMessages).has.length(1);
    expect(privateMessages[0].message).eq('${0} sold ${1}');
    expect(privateMessages[0].data).deep.eq([
      {type: LogMessageDataType.STRING, value: 'You'},
      {type: LogMessageDataType.CARDS, value: [CardName.ALGAE, CardName.ANTS]},
    ]);

    const gameLogs = new GameLogs();
    const playerMessages = gameLogs.getLogsForGameView(player.id, game, '1');
    expect(playerMessages.map((entry) => entry.message)).does.not.include('${0} sold ${1} patents');
    expect(playerMessages.filter((entry) => entry.message === '${0} sold ${1}')).has.length(1);

    const spectatorMessages = gameLogs.getLogsForGameView(game.spectatorId, game, '1');
    expect(spectatorMessages.map((entry) => entry.message)).does.not.include('${0} sold ${1} patents');
    const spectatorDetails = spectatorMessages.filter((entry) => entry.message === '${0} sold ${1}');
    expect(spectatorDetails).has.length(1);
    expect(spectatorDetails[0].playerId).eq(game.spectatorId);
    expect(spectatorDetails[0].data).deep.eq([
      {type: LogMessageDataType.PLAYER, value: player.color},
      {type: LogMessageDataType.CARDS, value: [CardName.ALGAE, CardName.ANTS]},
    ]);

    const otherPlayerMessages = gameLogs.getLogsForGameView(otherPlayer.id, game, '1');
    expect(otherPlayerMessages.map((entry) => entry.message)).includes('${0} sold ${1} patents');
    expect(otherPlayerMessages.map((entry) => entry.message)).does.not.include('${0} sold ${1}');
  });
});
