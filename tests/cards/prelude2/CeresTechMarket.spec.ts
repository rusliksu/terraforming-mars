import {expect} from 'chai';
import {CardName} from '../../../src/common/cards/CardName';
import {LogMessageDataType} from '../../../src/common/logs/LogMessageDataType';
import {cast} from '../../../src/common/utils/utils';
import {CeresTechMarket} from '../../../src/server/cards/prelude2/CeresTechMarket';
import {IProjectCard} from '../../../src/server/cards/IProjectCard';
import {newProjectCard} from '../../../src/server/createCard';
import {SelectCard} from '../../../src/server/inputs/SelectCard';
import {GameLogs} from '../../../src/server/routes/GameLogs';
import {testGame} from '../../TestGame';

describe('CeresTechMarket', () => {
  it('logs discarded action cards by name for the player and spectator', () => {
    const card = new CeresTechMarket();
    const [game, player, otherPlayer] = testGame(2);
    const discardedCards = [
      newProjectCard(CardName.ALGAE)!,
      newProjectCard(CardName.ANTS)!,
    ];
    game.gameLog = [];
    player.cardsInHand = [...discardedCards];
    player.megaCredits = 0;

    const selectCard = cast(card.action(player), SelectCard<IProjectCard>);
    selectCard.process({type: 'card', cards: discardedCards.map((card) => card.name)}, player);

    expect(player.cardsInHand).is.empty;
    expect(player.megaCredits).eq(4);

    const publicMessages = game.gameLog.filter((entry) => entry.playerId === undefined);
    expect(publicMessages).has.length(1);
    expect(publicMessages[0].message).eq('${0} gained ${1} M€ by discarding ${2} cards');

    const privateMessages = game.gameLog.filter((entry) => entry.playerId === player.id);
    expect(privateMessages).has.length(1);
    expect(privateMessages[0].message).eq('${0} discarded ${1}');
    expect(privateMessages[0].data).deep.eq([
      {type: LogMessageDataType.STRING, value: 'You'},
      {type: LogMessageDataType.CARDS, value: [CardName.ALGAE, CardName.ANTS]},
    ]);

    const gameLogs = new GameLogs();
    const spectatorMessages = gameLogs.getLogsForGameView(game.spectatorId, game, '1');
    const spectatorDetails = spectatorMessages.filter((entry) => entry.message === '${0} discarded ${1}');
    expect(spectatorDetails).has.length(1);
    expect(spectatorDetails[0].playerId).eq(game.spectatorId);
    expect(spectatorDetails[0].data).deep.eq([
      {type: LogMessageDataType.PLAYER, value: player.color},
      {type: LogMessageDataType.CARDS, value: [CardName.ALGAE, CardName.ANTS]},
    ]);

    const otherPlayerMessages = gameLogs.getLogsForGameView(otherPlayer.id, game, '1');
    expect(otherPlayerMessages.map((entry) => entry.message)).does.not.include('${0} discarded ${1}');
  });
});
